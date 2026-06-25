"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info,
    AlertTriangle, Link2, Search, Trash2, Sprout, Archive, Gauge,
    ChevronRight, CheckCircle, XCircle, Clock, Recycle,
} from 'lucide-react';

// ── Acts ──────────────────────────────────────────────────────────────────────
const ACTS = [
    { id: 1, label: 'The Problem',   icon: AlertTriangle },
    { id: 2, label: 'Refcount',      icon: Link2         },
    { id: 3, label: 'Cycles',        icon: Recycle       },
    { id: 4, label: 'Reachability',  icon: Search        },
    { id: 5, label: 'Mark',          icon: CheckCircle   },
    { id: 6, label: 'Sweep',         icon: Trash2        },
    { id: 7, label: 'Generational',  icon: Sprout        },
    { id: 8, label: 'In the Wild',   icon: Gauge         },
];

// ── Heap graph data (Acts 4–6) ──────────────────────────────────────────────────
const ROOTS = [
    { id: 'R1', x: 48,  y: 70,  label: 'stack' },
    { id: 'R2', x: 48,  y: 200, label: 'global' },
];
const HEAP_NODES = [
    { id: 'A', x: 160, y: 65 },
    { id: 'B', x: 270, y: 45 },
    { id: 'C', x: 360, y: 70 },
    { id: 'D', x: 160, y: 200 },
    { id: 'E', x: 275, y: 205 },
    { id: 'F', x: 365, y: 205 },
];
const HEAP_EDGES = [
    { from: 'R1', to: 'A', root: true },
    { from: 'R2', to: 'D', root: true },
    { from: 'A',  to: 'B' },
    { from: 'B',  to: 'C' },
    { from: 'D',  to: 'A' },
    { from: 'E',  to: 'F', curve: 26 },
    { from: 'F',  to: 'E', curve: 26 },
];
const ALL_POS = [...ROOTS, ...HEAP_NODES];
const pos = id => ALL_POS.find(n => n.id === id);

function edgePath(a, b, curve = 0) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len, r = 22;
    const sx = a.x + ux * r, sy = a.y + uy * r;
    const ex = b.x - ux * r, ey = b.y - uy * r;
    if (!curve) return `M ${sx} ${sy} L ${ex} ${ey}`;
    const mx = (sx + ex) / 2, my = (sy + ey) / 2;
    const cx = mx - uy * curve, cy = my + ux * curve;
    return `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`;
}

function HeapGraph({ marked = [], freed = [], current = null, dim = [] }) {
    const nodeStyle = (id) => {
        if (freed.includes(id))   return { fill: '#450a0a', stroke: '#ef4444', text: '#fca5a5', op: 0.45 };
        if (id === current)       return { fill: '#3f3f46', stroke: '#e4e4e7', text: '#ffffff', op: 1 };
        if (marked.includes(id))  return { fill: '#14532d', stroke: '#22c55e', text: '#bbf7d0', op: 1 };
        if (dim.includes(id))     return { fill: '#1e293b', stroke: '#475569', text: '#94a3b8', op: 0.4 };
        return { fill: '#1e293b', stroke: '#64748b', text: '#e2e8f0', op: 1 };
    };
    return (
        <svg viewBox="0 0 410 270" width="100%" className="max-h-[340px]">
            <defs>
                <marker id="ah" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="userSpaceOnUse">
                    <path d="M0,0 L6,3 L0,6 Z" fill="context-stroke" />
                </marker>
            </defs>

            {/* Edges */}
            {HEAP_EDGES.map((e, i) => {
                const a = pos(e.from), b = pos(e.to);
                const faded = freed.includes(e.from) || freed.includes(e.to);
                const bothMarked = marked.includes(e.from) && marked.includes(e.to);
                const stroke = e.root ? '#3b82f6' : faded ? '#7f1d1d' : bothMarked ? '#22c55e' : '#475569';
                return (
                    <path key={i} d={edgePath(a, b, e.curve || 0)} fill="none" stroke={stroke}
                        strokeWidth={e.root ? 2 : 1.6} markerEnd="url(#ah)"
                        opacity={faded ? 0.4 : 1} strokeDasharray={e.root ? '4 3' : '0'} />
                );
            })}

            {/* Roots */}
            {ROOTS.map(r => (
                <g key={r.id}>
                    <rect x={r.x - 22} y={r.y - 16} width="44" height="32" rx="6"
                        fill="#1e3a8a" stroke="#3b82f6" strokeWidth="1.8" />
                    <text x={r.x} y={r.y + 4} textAnchor="middle" fontSize="11" fill="#bfdbfe" fontFamily="monospace">{r.label}</text>
                </g>
            ))}

            {/* Heap nodes */}
            {HEAP_NODES.map(n => {
                const st = nodeStyle(n.id);
                return (
                    <g key={n.id} opacity={st.op}>
                        <circle cx={n.x} cy={n.y} r="20" fill={st.fill} stroke={st.stroke} strokeWidth="2" />
                        <text x={n.x} y={n.y + 5} textAnchor="middle" fontSize="15" fontWeight="bold" fill={st.text} fontFamily="monospace">{n.id}</text>
                        {freed.includes(n.id) && (
                            <text x={n.x + 16} y={n.y - 14} textAnchor="middle" fontSize="13" fill="#ef4444">✕</text>
                        )}
                        {marked.includes(n.id) && n.id !== current && (
                            <text x={n.x + 15} y={n.y - 13} textAnchor="middle" fontSize="12" fill="#22c55e">✓</text>
                        )}
                    </g>
                );
            })}
        </svg>
    );
}

// ── Step generation ───────────────────────────────────────────────────────────
function generateSteps() {
    const steps = [];
    const s = (act, actName, phase, data, explanation) => steps.push({ act, actName, phase, ...data, explanation });

    // ═══ ACT 1: The Problem ═══
    s(1, 'Manual Memory', 'manual', {
        code: [
            { x: 'int* p = new int[1000];  // allocate', t: 'norm' },
            { x: 'use(p);', t: 'norm' },
            { x: 'delete[] p;             // you must free', t: 'hot' },
        ],
    }, 'In C and C++ you manage memory by hand: every new/malloc needs a matching delete/free. Get it wrong and you hit two classic bugs. Forget to free → a memory leak (the program slowly eats all RAM). Free too early or twice → a dangling pointer / use-after-free (corruption or crash). Garbage Collection automates this: the runtime decides when memory is safe to reclaim, so you never call free yourself.');

    s(1, 'Manual Memory', 'bugs', {
        bugs: [
            { icon: 'leak',  title: 'Memory leak', desc: 'Allocated but never freed — RAM usage climbs forever.' },
            { icon: 'uaf',   title: 'Dangling pointer', desc: 'Freed too soon, then used — corruption or crash.' },
            { icon: 'double',title: 'Double free', desc: 'Freed twice — heap metadata corruption.' },
        ],
    }, 'These bugs are the source of a huge fraction of security vulnerabilities and crashes in C/C++ software. Managed languages — Python, Java, Go, JavaScript, C# — eliminate them with a garbage collector. The question is: how does the runtime know an object is no longer needed? Let us build up the answer.');

    // ═══ ACT 2: Reference Counting ═══
    s(2, 'Reference Counting', 'a_assign', {
        refcount: 1, refs: ['a'], freed: false, line: 'a = [1, 2, 3]',
    }, 'The simplest strategy is reference counting (used by CPython). Every object stores a count of how many references point to it. a = [1,2,3] creates the list object and sets its refcount to 1 — the name a is the one reference.');

    s(2, 'Reference Counting', 'b_assign', {
        refcount: 2, refs: ['a', 'b'], freed: false, line: 'b = a',
    }, 'b = a does not copy the list — it creates a second reference to the same object. The refcount rises to 2. This is O(1) bookkeeping done on every assignment, function call, and scope change.');

    s(2, 'Reference Counting', 'del_a', {
        refcount: 1, refs: ['b'], freed: false, line: 'del a',
    }, 'del a (or a going out of scope) removes one reference. The refcount drops to 1. The object is still alive because b keeps it reachable — so it is not freed.');

    s(2, 'Reference Counting', 'del_b', {
        refcount: 0, refs: [], freed: true, line: 'del b',
    }, 'del b drops the last reference. Refcount hits 0 → the object is freed immediately, right at that line. Reference counting reclaims memory promptly and predictably. But it has one fatal blind spot…');

    // ═══ ACT 3: Cycles ═══
    s(3, 'The Cycle Problem', 'build', {
        cycle: { x: { rc: 2, by: 'node + Y.prev' }, y: { rc: 1, by: 'X.next' }, local: true },
    }, 'Consider two objects that point at each other — a doubly linked list, a parent/child pair, a graph. node = X; X.next = Y; Y.prev = X. Now X has refcount 2 (the local node and Y.prev) and Y has refcount 1 (X.next). Everything looks normal.');

    s(3, 'The Cycle Problem', 'drop_local', {
        cycle: { x: { rc: 1, by: 'Y.prev' }, y: { rc: 1, by: 'X.next' }, local: false },
    }, 'Now the function returns, so the local variable node disappears. X\'s refcount drops to 1 — but it is NOT zero, because Y still points to it. And Y\'s count is 1 because X still points to it. Neither will ever reach 0.');

    s(3, 'The Cycle Problem', 'leak', {
        cycle: { x: { rc: 1, by: 'Y.prev' }, y: { rc: 1, by: 'X.next' }, local: false, leaked: true },
    }, 'This is a reference cycle, and it is a leak: X and Y are unreachable from your program — nothing outside the cycle points in — yet their refcounts keep each other alive forever. Reference counting alone can never collect a cycle. We need a fundamentally different idea: reachability.');

    // ═══ ACT 4: Reachability ═══
    s(4, 'Reachability', 'roots', {
        graph: { marked: [], freed: [], current: null, dim: [] },
    }, 'A tracing collector redefines "garbage" precisely: an object is live if it is reachable from a root, and garbage otherwise. Roots are the things the program can touch directly right now — local variables on the stack, global variables, and CPU registers (shown here as the blue boxes).');

    s(4, 'Reachability', 'garbage', {
        graph: { marked: [], freed: [], current: null, dim: ['E', 'F'] },
    }, 'Starting from the roots, follow every pointer. A and D are pointed to by roots; B and C are reachable through A; D also points back to A. So A, B, C, D are all live. But E and F? They only point to each other — no root can reach them. They are garbage, even though their reference counts are non-zero. Reachability catches exactly the cycle that refcounting missed.');

    // ═══ ACT 5: Mark ═══
    s(5, 'Mark Phase', 'roots', {
        graph: { marked: ['A', 'D'], freed: [], current: 'A', dim: [] },
    }, 'Mark-and-Sweep runs in two passes. The MARK phase starts at the roots and traverses the object graph (depth- or breadth-first), painting every object it reaches as "live". First, the objects directly held by roots — A and D — are marked.');

    s(5, 'Mark Phase', 'b', {
        graph: { marked: ['A', 'D', 'B'], freed: [], current: 'B', dim: [] },
    }, 'From A, follow its pointer to B and mark it. The collector keeps a worklist of objects to visit. Each object is marked once; if it is already marked, the collector skips it — which is exactly why cycles among live objects do not cause infinite loops.');

    s(5, 'Mark Phase', 'c', {
        graph: { marked: ['A', 'D', 'B', 'C'], freed: [], current: 'C', dim: [] },
    }, 'From B, follow to C and mark it. D\'s pointer back to A finds A already marked, so nothing more to do there. The worklist is now empty — the trace is complete.');

    s(5, 'Mark Phase', 'done', {
        graph: { marked: ['A', 'D', 'B', 'C'], freed: [], current: null, dim: ['E', 'F'] },
    }, 'Marking is done. A, B, C, D are marked live (green). E and F were never reached — they stay unmarked. The collector now knows, with certainty, that anything unmarked is unreachable and safe to reclaim. Notice it never even visited E or F: tracing cost is proportional to the LIVE set, not the garbage.');

    // ═══ ACT 6: Sweep ═══
    s(6, 'Sweep Phase', 'scan', {
        graph: { marked: ['A', 'B', 'C', 'D'], freed: [], current: 'E', dim: [] },
    }, 'The SWEEP phase walks linearly over the entire heap, examining every object. It reaches E — unmarked. Unmarked means unreachable means garbage.');

    s(6, 'Sweep Phase', 'free', {
        graph: { marked: ['A', 'B', 'C', 'D'], freed: ['E', 'F'], current: null, dim: [] },
    }, 'E and F are freed and their memory returned to the allocator — the leaked cycle that reference counting could never reclaim is gone. The marked objects A, B, C, D survive untouched.');

    s(6, 'Sweep Phase', 'reset', {
        graph: { marked: [], freed: ['E', 'F'], current: null, dim: [] },
    }, 'Finally the collector clears all the mark bits so the heap is ready for the next cycle. That is the whole algorithm: trace from roots to mark the live set, then sweep the rest. Many collectors also COMPACT here — sliding survivors together to defragment memory and make future allocation a simple pointer bump.');

    // ═══ ACT 7: Generational ═══
    s(7, 'Generational GC', 'hypothesis', {
        hypothesis: true,
    }, 'Marking the entire heap on every collection is expensive. Generational GC exploits the weak generational hypothesis: most objects die young. A temporary string in a loop lives microseconds; the objects that survive a few collections tend to live a long time. So why re-scan the old survivors over and over?');

    s(7, 'Generational GC', 'young', {
        gens: { young: ['o1', 'o2', 'o3', 'o4', 'o5'], old: ['X1', 'X2'], dead: [] },
    }, 'The heap is split into generations. New objects are allocated in the young generation (the "nursery" or Eden). It fills up quickly. The old generation holds long-lived survivors.');

    s(7, 'Generational GC', 'minor', {
        gens: { young: ['o1', 'o2', 'o3', 'o4', 'o5'], old: ['X1', 'X2'], dead: ['o1', 'o2', 'o4'] },
    }, 'When the young generation fills, a minor GC runs — but it only traces the young generation, not the whole heap. Most young objects (o1, o2, o4) are already unreachable and get collected. Because the young set is small and mostly dead, a minor GC is very fast and frequent.');

    s(7, 'Generational GC', 'promote', {
        gens: { young: [], old: ['X1', 'X2', 'o3', 'o5'], dead: [] },
    }, 'The few survivors (o3, o5) are promoted into the old generation — they have proven they live a while. The old generation is collected only rarely, by a slower major (full) GC. This split is why modern collectors feel low-overhead: the common case touches only a small, short-lived region.');

    // ═══ ACT 8: In the Wild ═══
    s(8, 'Stop-the-World', 'pause', {
        timeline: true,
    }, 'There is a catch. Many collectors must pause the application during GC — a "stop-the-world" pause — so the object graph does not change mid-trace. A long pause shows up as a stutter or freeze. Decades of GC research are essentially a war on pause time: concurrent collectors do most of the work while your program keeps running; incremental ones split it into tiny slices.');

    s(8, 'Stop-the-World', 'collectors', {
        collectors: [
            { name: 'CPython', strat: 'Refcount + cyclic GC', note: 'Frees promptly; a separate cycle detector mops up reference cycles.' },
            { name: 'Java (G1)', strat: 'Generational + concurrent', note: 'Region-based, mostly concurrent, with target pause times.' },
            { name: 'Go', strat: 'Concurrent mark-sweep', note: 'Non-generational, tuned for sub-millisecond pauses.' },
            { name: 'JavaScript (V8)', strat: 'Generational mark-sweep', note: 'Young "scavenger" + concurrent major GC.' },
        ],
    }, 'Real runtimes combine these ideas. CPython uses reference counting (prompt, simple) plus a cyclic collector for the cycles refcounting misses. The JVM, Go, and V8 use generational and/or concurrent tracing collectors tuned for low pause times. The trade-off versus C++ is the same throughout: you give up some throughput and control in exchange for never writing free again — and never shipping a use-after-free.');

    return steps;
}

// ── Scenes ────────────────────────────────────────────────────────────────────
function CodeBox({ lines }) {
    const cls = { norm: 'text-slate-300', hot: 'text-yellow-200 bg-yellow-500/10', cmt: 'text-slate-500 italic' };
    return (
        <div className="rounded-xl border border-slate-700/60 bg-slate-950/60 p-3 max-w-md mx-auto">
            <pre className="text-[12px] font-mono leading-relaxed">
                {lines.map((l, i) => <div key={i} className={`px-1 rounded ${cls[l.t || 'norm']}`}>{l.x || ' '}</div>)}
            </pre>
        </div>
    );
}

const bugIcon = { leak: AlertTriangle, uaf: XCircle, double: Trash2 };

function SceneProblem({ step }) {
    if (step.phase === 'manual') return <div className="py-8 w-full"><CodeBox lines={step.code} /></div>;
    return (
        <div className="flex flex-col gap-3 py-6 max-w-md mx-auto w-full">
            {step.bugs.map((b, i) => {
                const Icon = bugIcon[b.icon] || AlertTriangle;
                return (
                    <div key={i} className="flex items-start gap-3 px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/5">
                        <Icon className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                        <div>
                            <div className="text-sm font-semibold text-red-300">{b.title}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{b.desc}</div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function SceneRefcount({ step }) {
    return (
        <div className="flex flex-col items-center justify-center gap-6 py-8 w-full">
            <code className="text-sm font-mono px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-700/60 text-slate-300">{step.line}</code>
            <div className="flex items-center gap-8">
                <div className="flex flex-col gap-2 items-end min-w-[60px]">
                    {step.refs.length === 0
                        ? <span className="text-xs text-slate-600 italic">no refs</span>
                        : step.refs.map(r => (
                            <div key={r} className="flex items-center gap-2">
                                <code className="text-sm font-mono text-blue-300 px-2 py-1 rounded bg-blue-500/10 border border-blue-500/30">{r}</code>
                                <ChevronRight className="h-4 w-4 text-blue-400" />
                            </div>
                        ))}
                </div>
                <div className={`relative flex flex-col items-center justify-center w-32 h-24 rounded-2xl border-2 transition-all ${
                    step.freed ? 'border-red-500/50 bg-red-500/10 opacity-50' : 'border-zinc-500/50 bg-zinc-500/10'
                }`}>
                    <code className="text-sm font-mono text-slate-300">[1, 2, 3]</code>
                    <div className="absolute -top-3 -right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-slate-900 border border-slate-600">
                        <span className="text-[9px] text-slate-500 uppercase">rc</span>
                        <span className={`text-sm font-bold font-mono ${step.refcount === 0 ? 'text-red-400' : 'text-green-400'}`}>{step.refcount}</span>
                    </div>
                    {step.freed && <div className="absolute inset-0 flex items-center justify-center"><Trash2 className="h-7 w-7 text-red-400" /></div>}
                </div>
            </div>
            {step.freed && <div className="text-xs text-red-400 font-semibold">refcount 0 → freed immediately</div>}
        </div>
    );
}

function SceneCycle({ step }) {
    const { x, y, local, leaked } = step.cycle;
    return (
        <div className="flex flex-col items-center justify-center gap-6 py-8 w-full">
            {local
                ? <code className="text-xs font-mono text-blue-300 px-2 py-1 rounded bg-blue-500/10 border border-blue-500/30">local: node → X</code>
                : <code className="text-xs font-mono text-slate-600 px-2 py-1 rounded bg-slate-900/60 border border-slate-700/60 line-through">node (out of scope)</code>}
            <div className="flex items-center gap-6">
                {[{ id: 'X', d: x }, { id: 'Y', d: y }].map(o => (
                    <div key={o.id} className={`relative flex flex-col items-center justify-center w-28 h-24 rounded-2xl border-2 transition-all ${
                        leaked ? 'border-red-500/50 bg-red-500/10' : 'border-zinc-500/50 bg-zinc-500/10'
                    }`}>
                        <span className="text-lg font-bold font-mono text-slate-200">{o.id}</span>
                        <span className="text-[10px] text-slate-500 mt-0.5">{o.d.by}</span>
                        <div className="absolute -top-3 -right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-slate-900 border border-slate-600">
                            <span className="text-[9px] text-slate-500 uppercase">rc</span>
                            <span className="text-sm font-bold font-mono text-yellow-400">{o.d.rc}</span>
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
                <Recycle className="h-4 w-4" /> X.next → Y &nbsp;·&nbsp; Y.prev → X
            </div>
            {leaked && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <span className="text-xs text-red-300 font-semibold">Unreachable, but rc never hits 0 → leaked forever</span>
                </div>
            )}
        </div>
    );
}

function SceneHeap({ step }) {
    return (
        <div className="py-2 w-full">
            <HeapGraph {...step.graph} />
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-2 text-[10px] text-slate-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-900 border border-blue-500 inline-block" /> root</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-900 border border-green-500 inline-block" /> marked live</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-950 border border-red-500 inline-block" /> freed</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-slate-800 border border-slate-600 inline-block opacity-40" /> garbage</span>
            </div>
        </div>
    );
}

function SceneGenerational({ step }) {
    if (step.hypothesis) {
        return (
            <div className="flex flex-col items-center justify-center gap-5 py-10 w-full">
                <div className="text-sm font-semibold text-zinc-300">Weak Generational Hypothesis</div>
                <div className="w-full max-w-sm">
                    <div className="flex justify-between text-[11px] text-slate-500 mb-1"><span>object lifetime →</span><span>count</span></div>
                    <div className="h-28 flex items-end gap-1">
                        {[100, 62, 34, 18, 10, 6, 4, 3, 2, 2, 1, 1].map((h, i) => (
                            <div key={i} className={`flex-1 rounded-t ${i < 3 ? 'bg-orange-500/70' : 'bg-zinc-600/60'}`} style={{ height: `${h}%` }} />
                        ))}
                    </div>
                    <div className="flex justify-between text-[10px] mt-1"><span className="text-orange-400">die young (most)</span><span className="text-slate-500">live long (few)</span></div>
                </div>
            </div>
        );
    }
    const { young, old, dead } = step.gens;
    return (
        <div className="flex flex-col gap-4 py-6 w-full">
            <div className="rounded-xl border border-green-600/40 bg-green-500/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Sprout className="h-4 w-4 text-green-400" />
                    <span className="text-xs font-semibold text-green-300 uppercase tracking-widest">Young generation (Eden)</span>
                </div>
                <div className="flex flex-wrap gap-2 min-h-[44px]">
                    {young.length === 0 && <span className="text-xs text-slate-600 italic">empty — survivors promoted</span>}
                    {young.map(o => {
                        const isDead = dead.includes(o);
                        return (
                            <div key={o} className={`w-11 h-11 rounded-lg border flex items-center justify-center text-xs font-mono transition-all ${
                                isDead ? 'border-red-500/50 bg-red-500/10 text-red-400 line-through opacity-60' : 'border-green-500/50 bg-green-500/15 text-green-200'
                            }`}>{o}</div>
                        );
                    })}
                </div>
                {dead.length > 0 && <div className="text-[11px] text-red-400 mt-2">minor GC: {dead.length} collected (scans young only — fast)</div>}
            </div>

            <div className="rounded-xl border border-blue-600/40 bg-blue-500/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Archive className="h-4 w-4 text-blue-400" />
                    <span className="text-xs font-semibold text-blue-300 uppercase tracking-widest">Old generation</span>
                    <span className="text-[10px] text-slate-500 ml-auto">collected rarely (major GC)</span>
                </div>
                <div className="flex flex-wrap gap-2 min-h-[44px]">
                    {old.map(o => (
                        <div key={o} className="w-11 h-11 rounded-lg border border-blue-500/50 bg-blue-500/15 text-blue-200 flex items-center justify-center text-xs font-mono">{o}</div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function SceneWild({ step }) {
    if (step.timeline) {
        return (
            <div className="flex flex-col items-center justify-center gap-5 py-10 w-full">
                <div className="w-full max-w-md">
                    <div className="text-[11px] text-slate-500 mb-1">application timeline →</div>
                    <div className="flex h-10 rounded-lg overflow-hidden border border-slate-700/60">
                        <div className="bg-green-600/50 flex items-center justify-center text-[10px] text-green-100" style={{ width: '40%' }}>running</div>
                        <div className="bg-red-600/60 flex items-center justify-center text-[10px] text-red-50" style={{ width: '20%' }}>GC pause</div>
                        <div className="bg-green-600/50 flex items-center justify-center text-[10px] text-green-100" style={{ width: '40%' }}>running</div>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 text-[11px] text-red-400"><Clock className="h-3.5 w-3.5" />stop-the-world: app frozen while the heap is traced</div>
                </div>
                <div className="text-xs text-slate-500 text-center max-w-sm">Concurrent &amp; incremental collectors shrink this red bar — doing GC work alongside the running program.</div>
            </div>
        );
    }
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-6 w-full">
            {step.collectors.map((c, i) => (
                <div key={i} className="px-4 py-3 rounded-xl border border-slate-700/60 bg-slate-900/50">
                    <div className="text-sm font-semibold text-zinc-200">{c.name}</div>
                    <div className="text-[11px] text-zinc-400 font-mono mt-0.5">{c.strat}</div>
                    <div className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">{c.note}</div>
                </div>
            ))}
        </div>
    );
}

function VisualizationPanel({ step }) {
    if (!step) return null;
    if (step.act === 1) return <SceneProblem step={step} />;
    if (step.act === 2) return <SceneRefcount step={step} />;
    if (step.act === 3) return <SceneCycle step={step} />;
    if (step.act === 4 || step.act === 5 || step.act === 6) return <SceneHeap step={step} />;
    if (step.act === 7) return <SceneGenerational step={step} />;
    if (step.act === 8) return <SceneWild step={step} />;
    return null;
}

// ── Quiz ──────────────────────────────────────────────────────────────────────
const QUIZ = [
    {
        question: 'Why can reference counting alone never reclaim a reference cycle?',
        options: [
            'Cycles use too much memory to scan',
            'Objects in the cycle keep each other\'s count above zero, even when unreachable',
            'Reference counts cannot exceed 1',
            'The garbage collector ignores cyclic objects on purpose',
        ],
        correct: 1,
        explanation: 'In a cycle, each object holds a reference to the next, so every count stays ≥ 1 even after the program drops all external references. The count never reaches 0, so a pure refcounting collector never frees them. Tracing by reachability is what catches this.',
    },
    {
        question: 'In mark-and-sweep, what defines an object as "garbage"?',
        options: [
            'Its reference count is exactly zero',
            'It has not been used recently',
            'It is unreachable from any root (stack, globals, registers)',
            'It is larger than the young generation',
        ],
        correct: 2,
        explanation: 'Tracing collectors define garbage as unreachable from the roots. The mark phase traces all reachable objects from the roots; the sweep phase frees everything left unmarked — regardless of reference counts.',
    },
    {
        question: 'What assumption makes generational GC efficient?',
        options: [
            'Objects never reference each other',
            'Most objects die young, so the small young generation can be collected often and cheaply',
            'Memory is infinite',
            'Old objects are always collected first',
        ],
        correct: 1,
        explanation: 'The weak generational hypothesis: most objects die young. So the collector scans the small young generation frequently (fast minor GCs) and only rarely does an expensive full collection of long-lived old objects.',
    },
];

function QuizPanel({ quizState, setQuizState }) {
    const q = QUIZ[quizState.current];
    if (quizState.complete) {
        return (
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-5 text-center">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{QUIZ.length}</div>
                <div className="text-zinc-400 text-sm mb-4">
                    {quizState.score === QUIZ.length ? 'Perfect — you understand how GC reclaims memory!' : 'Review the explanations to reinforce the concepts.'}
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
                            setQuizState(s => ({ ...s, selected: i, answered: true, score: correct ? s.score + 1 : s.score }));
                        }} className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-all ${cls}`}>{opt}</button>
                    );
                })}
            </div>
            {quizState.answered && <div className="mt-3 text-xs text-slate-500 bg-slate-800/50 rounded-lg p-2 leading-relaxed">{q.explanation}</div>}
            {quizState.answered && (
                <button onClick={() => {
                    if (quizState.current + 1 >= QUIZ.length) setQuizState(s => ({ ...s, complete: true }));
                    else setQuizState(s => ({ ...s, current: s.current + 1, selected: null, answered: false }));
                }} className="mt-3 w-full py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-xs text-white transition-colors">
                    {quizState.current + 1 >= QUIZ.length ? 'See Score' : 'Next Question'}
                </button>
            )}
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────
const STEPS = generateSteps();

export default function GarbageCollectionPage() {
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying,   setIsPlaying]   = useState(false);
    const [speed,       setSpeed]       = useState(1100);
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
                            <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">Garbage Collection</h1>
                            <p className="text-zinc-300 text-sm mt-1">
                                How runtimes reclaim memory automatically — from reference counting to mark-sweep and generational GC
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
                            <div className="px-5 min-h-[340px] flex items-center">
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

                        {/* Strategy reference */}
                        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-3">GC strategies</p>
                            <div className="space-y-1.5 text-xs">
                                {[
                                    { acts: [2, 3], label: 'Reference counting', note: 'O(1), prompt, misses cycles' },
                                    { acts: [4, 5, 6], label: 'Mark & sweep', note: 'tracing by reachability' },
                                    { acts: [7], label: 'Generational', note: 'young dies fast → cheap' },
                                    { acts: [8], label: 'Concurrent', note: 'shrink pause time' },
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
