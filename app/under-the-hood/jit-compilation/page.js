"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info,
    Scale, Footprints, Flame, Layers3, Crosshair, Rocket, TriangleAlert, LineChart,
} from 'lucide-react';

// ── Acts ──────────────────────────────────────────────────────────────────────
const ACTS = [
    { id: 1, label: 'Two Extremes', icon: Scale         },
    { id: 2, label: 'Interpret',    icon: Footprints    },
    { id: 3, label: 'Hot Code',     icon: Flame         },
    { id: 4, label: 'Tiers',        icon: Layers3       },
    { id: 5, label: 'Speculation',  icon: Crosshair     },
    { id: 6, label: 'Optimized',    icon: Rocket        },
    { id: 7, label: 'Deopt',        icon: TriangleAlert },
    { id: 8, label: 'Warmup',       icon: LineChart     },
];

// ── The function under study ───────────────────────────────────────────────────
const SOURCE = [
    'function sum(arr) {',
    '  let total = 0;',
    '  for (let i = 0; i < arr.length; i++)',
    '    total += arr[i];',
    '  return total;',
    '}',
];

const TIERS = [
    { id: 0, name: 'Tier 0 — Interpreter', sub: 'runs bytecode, collects feedback', color: '#64748b' },
    { id: 1, name: 'Tier 1 — Baseline JIT', sub: 'compiles fast, assumes nothing', color: '#38bdf8' },
    { id: 2, name: 'Tier 2 — Optimizing JIT', sub: 'compiles slow, speculates hard', color: '#22c55e' },
];

const EMITTED = {
    bytecode: {
        title: 'bytecode — one op at a time',
        tone: '#94a3b8',
        lines: [
            'LdaZero',
            'Star   r_total',
            'LdaKeyedProperty  a0, r_i   ; arr[i]',
            'Add    r_total              ; generic',
            'Star   r_total',
            'JumpLoop  @loop',
        ],
    },
    baseline: {
        title: 'tier 1 — quick, fully generic machine code',
        tone: '#7dd3fc',
        lines: [
            '  mov   rax, [rbp-8]        ; total',
            '  call  LoadElement_Generic ; any array kind',
            '  call  Add_Generic         ; any type pair',
            '  mov   [rbp-8], rax',
            '  jmp   loop                ; no assumptions,',
            '                            ; so no guards needed',
        ],
    },
    optimized: {
        title: 'tier 2 — speculating: packed integer array',
        tone: '#86efac',
        lines: [
            '  cmp   [rdi-1], PACKED_SMI_MAP',
            '  jne   deopt               ; <- guard',
            '  add   rax, [rdi+rcx*8]    ; raw int add,',
            '                            ; unboxed, inlined',
            '  inc   rcx',
            '  jmp   loop                ; no bounds check',
        ],
    },
};

// ── Persistent animated stage ──────────────────────────────────────────────────
function JitStage({ step }) {
    const counter = step.counter ?? 0;
    const threshold = step.threshold ?? 10000;
    const pct = Math.min(100, (counter / threshold) * 100);
    const emitted = EMITTED[step.emitted] || null;

    return (
        <svg viewBox="0 0 760 430" width="100%" className="max-h-[430px] select-none">
            <style>{`
                .jt-box  { transition: fill .4s ease, stroke .4s ease, stroke-width .35s ease; }
                .jt-bar  { transition: width .6s cubic-bezier(.45,0,.15,1), fill .4s ease; }
                .jt-fade { transition: opacity .5s ease; }
                .jt-row  { transition: fill .35s ease, opacity .35s ease; }
                .jt-flow { stroke-dasharray: 6 5; animation: jtdash .55s linear infinite; }
                @keyframes jtdash { to { stroke-dashoffset: -22; } }
            `}</style>
            <defs>
                <marker id="jtah" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="userSpaceOnUse">
                    <path d="M0,0 L6,3 L0,6 Z" fill="context-stroke" />
                </marker>
            </defs>

            {/* ══ Source panel ══ */}
            <rect x="28" y="34" width="336" height="126" rx="10" fill="#020617" stroke="#334155" strokeWidth="1.4" />
            <text x="42" y="52" fontSize="9" fill="#64748b" fontFamily="monospace">the function being run, over and over</text>
            {SOURCE.map((l, i) => (
                <g key={i}>
                    {step.activeLine === i && (
                        <rect x="34" y={58 + i * 16} width="324" height="15" rx="3" fill="#3f3f46" className="jt-box" />
                    )}
                    <text x="42" y={70 + i * 16} fontSize="10.5" fontFamily="monospace"
                        fill={step.activeLine === i ? '#f8fafc' : '#64748b'}>{l}</text>
                </g>
            ))}

            {/* ══ Profiler panel ══ */}
            <rect x="380" y="34" width="352" height="126" rx="10" fill="#020617" stroke="#334155" strokeWidth="1.4" />
            <text x="394" y="52" fontSize="9" fill="#64748b" fontFamily="monospace">profiler — the interpreter&apos;s notebook</text>

            <text x="394" y="76" fontSize="10" fill="#94a3b8" fontFamily="monospace">invocation counter</text>
            <text x="718" y="76" textAnchor="end" fontSize="11" fontWeight="bold" fontFamily="monospace"
                fill={counter >= threshold ? '#f59e0b' : '#e2e8f0'}>{counter.toLocaleString()}</text>
            <rect x="394" y="84" width="324" height="14" rx="4" fill="#0f172a" stroke="#1e293b" strokeWidth="1" />
            <rect className="jt-bar" x="394" y="84" width={(324 * pct) / 100} height="14" rx="4"
                fill={counter >= threshold ? '#f59e0b' : '#3b82f6'} />
            <line x1="718" y1="80" x2="718" y2="102" stroke="#f59e0b" strokeWidth="1.4" strokeDasharray="3 2" />
            <text x="718" y="114" textAnchor="end" fontSize="8" fill="#b45309" fontFamily="monospace">hot threshold</text>

            {/* type feedback */}
            <text x="394" y="136" fontSize="10" fill="#94a3b8" fontFamily="monospace">type feedback for arr[i]</text>
            {(step.types || []).map((t, i) => (
                <g key={t.t} className="jt-row">
                    <rect x={394 + i * 112} y={142} width={104} height={12} rx="3"
                        fill={t.bad ? '#3a0d0d' : '#14532d'} stroke={t.bad ? '#ef4444' : '#22c55e'} strokeWidth="1" />
                    <text x={446 + i * 112} y={152} textAnchor="middle" fontSize="8"
                        fill={t.bad ? '#fca5a5' : '#bbf7d0'} fontFamily="monospace">{t.t} x{t.n}</text>
                </g>
            ))}
            {step.shape && (
                <text x="718" y="152" textAnchor="end" fontSize="9" fontFamily="monospace"
                    fill={step.shape === 'monomorphic' ? '#22c55e' : step.shape === 'polymorphic' ? '#f59e0b' : '#ef4444'}>{step.shape}</text>
            )}

            {/* ══ Tier ladder ══ */}
            <text x="28" y="188" fontSize="9" fill="#64748b" fontFamily="monospace">execution tiers</text>
            {TIERS.map((t, i) => {
                const active = step.tier === t.id;
                const compiled = (step.compiled || []).includes(t.id);
                const y = 196 + i * 62;
                return (
                    <g key={t.id}>
                        <rect x="28" y={y} width="336" height="52" rx="9" className="jt-box"
                            fill={active ? '#3f3f46' : compiled ? '#111827' : '#0b1220'}
                            stroke={active ? '#e4e4e7' : compiled ? t.color : '#1e293b'}
                            strokeWidth={active ? 2.4 : compiled ? 1.6 : 1.2} />
                        <text x="46" y={y + 22} fontSize="11.5" fontWeight="bold" fontFamily="monospace"
                            fill={active ? '#f8fafc' : compiled ? t.color : '#475569'}>{t.name}</text>
                        <text x="46" y={y + 38} fontSize="9" fontFamily="monospace"
                            fill={active ? '#cbd5e1' : '#475569'}>{t.sub}</text>
                        {active && (
                            <circle cx="348" cy={y + 26} r="5" fill="#22c55e">
                                <animate attributeName="opacity" values="1;0.3;1" dur="1.2s" repeatCount="indefinite" />
                            </circle>
                        )}
                    </g>
                );
            })}
            {step.promote !== undefined && (
                <path d={`M370,${232 + step.promote * 62} L370,${210 + (step.promote + 1) * 62}`}
                    stroke="#22c55e" strokeWidth="2.2" markerEnd="url(#jtah)" className="jt-flow" fill="none" />
            )}
            {step.deopt && (
                <path d="M374,320 L374,238" stroke="#ef4444" strokeWidth="2.4" markerEnd="url(#jtah)" className="jt-flow" fill="none" />
            )}

            {/* ══ Emitted code panel ══ */}
            <rect x="380" y="196" width="352" height="180" rx="10" fill="#020617"
                stroke={step.guardFail ? '#ef4444' : '#334155'} strokeWidth={step.guardFail ? 2 : 1.4} className="jt-box" />
            {emitted ? (
                <g className="jt-fade">
                    <text x="394" y="216" fontSize="9" fill={emitted.tone} fontFamily="monospace">{emitted.title}</text>
                    {emitted.lines.map((l, i) => {
                        const isGuard = step.guardFail && l.includes('jne');
                        return (
                            <g key={i}>
                                {isGuard && <rect x="388" y={224 + i * 20} width="336" height="18" rx="3" fill="#3a0d0d" />}
                                <text x="394" y={238 + i * 20} fontSize="10" fontFamily="monospace"
                                    fill={isGuard ? '#fca5a5' : emitted.tone}>{l}</text>
                            </g>
                        );
                    })}
                    {step.guardFail && (
                        <text x="556" y="366" textAnchor="middle" fontSize="10.5" fontWeight="bold" fill="#ef4444" fontFamily="monospace">
                            guard failed — the assumption no longer holds
                        </text>
                    )}
                </g>
            ) : (
                <text x="556" y="292" textAnchor="middle" fontSize="11" fill="#334155" fontFamily="monospace">nothing compiled yet</text>
            )}

            {step.caption && (
                <text x="380" y="406" textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="monospace">{step.caption}</text>
            )}
        </svg>
    );
}

// ── Throughput curve (Acts 1 and 8) ────────────────────────────────────────────
const CX0 = 92, CX1 = 712, CY0 = 84, CY1 = 330;
const sx = t => CX0 + (t / 100) * (CX1 - CX0);
const sy = v => CY1 - (v / 100) * (CY1 - CY0);

function CurveScene({ show, note }) {
    const interp = [[0, 18], [100, 18]];
    const aot    = [[0, 0], [22, 0], [22, 88], [100, 88]];
    const jit    = [[0, 16], [26, 16], [30, 52], [54, 52], [58, 92], [100, 92]];
    const line = pts => pts.map(([t, v]) => `${sx(t)},${sy(v)}`).join(' ');

    const series = [
        { id: 'interp', pts: interp, color: '#64748b', label: 'pure interpreter', dash: 'none' },
        { id: 'aot',    pts: aot,    color: '#a78bfa', label: 'AOT compiled (C++, Rust)', dash: 'none' },
        { id: 'jit',    pts: jit,    color: '#22c55e', label: 'JIT — tiers kick in over time', dash: 'none' },
    ];

    return (
        <svg viewBox="0 0 760 430" width="100%" className="max-h-[430px] select-none">
            <style>{`.cv { transition: opacity .6s ease; }`}</style>
            {/* axes */}
            <line x1={CX0} y1={CY1} x2={CX1} y2={CY1} stroke="#334155" strokeWidth="1.4" />
            <line x1={CX0} y1={CY0} x2={CX0} y2={CY1} stroke="#334155" strokeWidth="1.4" />
            <text x={(CX0 + CX1) / 2} y={CY1 + 30} textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="monospace">
                time the process has been running →
            </text>
            <text x={CX0 - 12} y={(CY0 + CY1) / 2} textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="monospace"
                transform={`rotate(-90 ${CX0 - 12} ${(CY0 + CY1) / 2})`}>throughput →</text>

            {series.map((s, i) => (
                <g key={s.id} className="cv" style={{ opacity: show.includes(s.id) ? 1 : 0.06 }}>
                    <polyline points={line(s.pts)} fill="none" stroke={s.color} strokeWidth="2.6" strokeLinejoin="round" />
                    <rect x={CX0 + 14} y={CY0 - 44 + i * 20} width={10} height={10} rx="2" fill={s.color} />
                    <text x={CX0 + 32} y={CY0 - 35 + i * 20} fontSize="10" fill={show.includes(s.id) ? '#cbd5e1' : '#334155'} fontFamily="monospace">{s.label}</text>
                </g>
            ))}

            {show.includes('aot') && (
                <text x={sx(22)} y={CY1 + 14} textAnchor="middle" fontSize="9" fill="#a78bfa" fontFamily="monospace">compile first</text>
            )}
            {show.includes('jit') && (
                <>
                    <text x={sx(30)} y={sy(52) - 10} textAnchor="middle" fontSize="9" fill="#22c55e" fontFamily="monospace">tier 1</text>
                    <text x={sx(58)} y={sy(92) - 10} textAnchor="middle" fontSize="9" fill="#22c55e" fontFamily="monospace">tier 2</text>
                </>
            )}

            {note && <text x="380" y="386" textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="monospace">{note}</text>}
        </svg>
    );
}

// ── Recap ───────────────────────────────────────────────────────────────────────
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

// ── Step generation ─────────────────────────────────────────────────────────────
function generateSteps() {
    const steps = [];
    const s = (act, actName, data, explanation) => steps.push({ act, actName, ...data, explanation });

    const SMI = n => [{ t: 'Smi', n }];

    // ═══ ACT 1: Two Extremes ═══
    s(1, 'Two Extremes', { curve: true, show: ['interp'], note: 'starts instantly, never gets faster' },
        'There are two classic ways to run a program. An interpreter reads your code and executes it one operation at a time. It starts instantly — no compile step — but it pays interpretation overhead on every single operation, forever. The line is flat: it never learns, never speeds up.');
    s(1, 'Two Extremes', { curve: true, show: ['interp', 'aot'], note: 'fast forever — but only after paying up front, and it must guess' },
        'Ahead-of-time compilation is the opposite. A C++ or Rust compiler turns everything into machine code before the program runs. Nothing to start with, then full speed forever. But it has to commit to every decision without ever seeing real input — it can only reason about what it can prove statically.');
    s(1, 'Two Extremes', { curve: true, show: ['interp', 'aot'], note: 'a JIT wants the fast start of one and the steady state of the other' },
        'A JIT tries to have both: start interpreting immediately, then compile the parts that turn out to matter — while the program is running. That timing is the whole trick. A JIT compiles late, which means it compiles with information no AOT compiler can ever have: what the code actually did on real data.');

    // ═══ ACT 2: Start Interpreting ═══
    s(2, 'Start by Interpreting', { tier: 0, compiled: [], counter: 0, activeLine: 0, emitted: 'bytecode',
        caption: 'no compilation yet — execution begins immediately' },
        'So execution starts in tier 0. The source is parsed to bytecode and the interpreter walks it. Nothing is compiled to machine code yet, so startup is immediate. For code that runs once — module setup, a config parse — this is exactly right, and compiling it would be wasted effort.');
    s(2, 'Start by Interpreting', { tier: 0, compiled: [], counter: 340, activeLine: 3, emitted: 'bytecode', types: SMI(340), shape: 'monomorphic',
        caption: 'every call also increments a counter and records observed types' },
        'But the interpreter is doing a second job while it runs: profiling. It counts how often each function and loop executes, and it records what types actually flow through each operation. Here arr[i] has produced a small integer — a Smi — every time so far.');
    s(2, 'Start by Interpreting', { tier: 0, compiled: [], counter: 3200, activeLine: 3, emitted: 'bytecode', types: SMI(3200), shape: 'monomorphic',
        caption: 'this profile is information no static compiler could have' },
        'This is the JIT\'s real advantage, and it is worth being precise about why. An AOT compiler looking at `total += arr[i]` in a dynamic language must emit code handling every possibility — integers, floats, strings, objects with valueOf. The profile says it has been an integer three thousand times running. That is a fact about this program on this data, and no amount of static analysis could establish it.');

    // ═══ ACT 3: Finding Hot Code ═══
    s(3, 'Finding Hot Code', { tier: 0, compiled: [], counter: 9200, activeLine: 3, emitted: 'bytecode', types: SMI(9200), shape: 'monomorphic',
        caption: 'the counter approaches the threshold' },
        'The counter keeps climbing. Most functions in a program never get anywhere near the threshold — the classic observation is that a small fraction of the code accounts for the overwhelming majority of execution time. The profiler exists to find that fraction rather than guess at it.');
    s(3, 'Finding Hot Code', { tier: 0, compiled: [], counter: 10000, threshold: 10000, activeLine: 3, emitted: 'bytecode', types: SMI(10000), shape: 'monomorphic',
        caption: 'threshold crossed — sum() is now officially hot' },
        'Threshold crossed. sum() is hot, and the engine queues it for compilation — typically on a background thread, so the interpreter keeps running the program meanwhile. One subtlety: a long-running loop can be hot without the function ever being called twice, so engines can also swap the running frame mid-loop. That is on-stack replacement.');

    // ═══ ACT 4: Tiered Compilation ═══
    s(4, 'Tiers', { tier: 1, compiled: [1], counter: 10400, emitted: 'baseline', types: SMI(10400), shape: 'monomorphic', promote: 0,
        caption: 'tier 1 compiles in microseconds and assumes nothing' },
        'Rather than jumping straight to the best possible code, engines use tiers. Tier 1 is a baseline compiler: it compiles almost instantly and emits fully generic machine code — every operation still calls a helper that handles any type. It is maybe two to five times faster than interpreting, and crucially it was cheap to produce.');
    s(4, 'Tiers', { tier: 1, compiled: [1], counter: 24000, threshold: 40000, emitted: 'baseline', types: SMI(24000), shape: 'monomorphic',
        caption: 'still counting — a second, higher threshold is watching' },
        'Why not go straight to the optimizing compiler? Because optimizing is expensive — it can cost milliseconds of CPU per function. Spend that on something that runs 10,000 times and stops, and you lost. Tiering is a bet-sizing strategy: cheap code for moderately hot functions, expensive code only for the genuinely hottest.');
    s(4, 'Tiers', { tier: 1, compiled: [1], counter: 40000, threshold: 40000, emitted: 'baseline', types: SMI(40000), shape: 'monomorphic', promote: 1,
        caption: 'second threshold crossed — promote to the optimizing compiler' },
        'sum() crosses the second threshold. Now it has earned real optimization, and the engine hands the optimizing compiler both the bytecode and the accumulated profile. Real engines have more tiers than this — V8 has Ignition, Sparkplug, Maglev and TurboFan — but the shape is always the same ladder.');

    // ═══ ACT 5: Speculation ═══
    s(5, 'Speculation', { tier: 1, compiled: [1], counter: 40000, emitted: 'baseline', types: SMI(40000), shape: 'monomorphic',
        caption: 'one type, every time — the best case for a JIT' },
        'The optimizing compiler starts from the profile. arr[i] has been a Smi 40,000 times and nothing else, ever. That is called monomorphic — one shape at this site — and it is the single most valuable thing a JIT can learn.');
    s(5, 'Speculation', { tier: 1, compiled: [1], counter: 40000, emitted: 'baseline', types: [{ t: 'Smi', n: 40000 }], shape: 'monomorphic',
        caption: 'an inline cache remembers the shape it saw and the code that handled it' },
        'The mechanism underneath is the inline cache. Each property or element access remembers the object shape it last saw and the code that handled it, so the next access with the same shape skips the lookup entirely. Monomorphic sites are fast; a site seeing two to four shapes goes polymorphic and gets slower; beyond that it goes megamorphic and falls back to a generic dictionary lookup. This is the real reason "keep your object shapes consistent" is such durable advice in JavaScript.');
    s(5, 'Speculation', { tier: 2, compiled: [1, 2], counter: 40000, emitted: 'optimized', types: SMI(40000), shape: 'monomorphic', promote: 1,
        caption: 'compile as if the assumption is guaranteed — then guard it' },
        'So the compiler makes a bet. It compiles the loop as though arr is definitely a packed integer array — not as a possibility to check, but as a fact to build on. That is speculative optimization, and it is only safe because of the guard on the next line: a cheap check that bails out if the assumption ever stops holding.');

    // ═══ ACT 6: Optimized Code ═══
    s(6, 'Optimized Code', { tier: 2, compiled: [1, 2], counter: 52000, emitted: 'optimized', types: SMI(52000), shape: 'monomorphic',
        caption: 'one guard up front, then straight-line integer work' },
        'Look at what the assumption bought. No type dispatch — just a raw integer add. No boxing, because the values are known to be unboxed integers. No bounds check inside the loop, because the length was proven once outside it. The whole loop body collapsed to a few instructions.');
    s(6, 'Optimized Code', { tier: 2, compiled: [1, 2], counter: 88000, emitted: 'optimized', types: SMI(88000), shape: 'monomorphic',
        caption: 'now running 10–100× faster than the interpreter' },
        'And this compounds. Once types are known, the compiler can inline small functions — which exposes more type information, which enables more inlining. It can hoist loop-invariant work out, eliminate redundant loads, and keep values in registers across iterations. Inlining is often called the mother of all optimizations precisely because of that cascade.');
    s(6, 'Optimized Code', { tier: 2, compiled: [1, 2], counter: 120000, emitted: 'optimized', types: SMI(120000), shape: 'monomorphic',
        caption: 'the guard is the price of admission — and it is cheap' },
        'The cost of all this is that single guard: one compare-and-branch, perfectly predicted, essentially free. It is a remarkable trade — one cheap check per iteration in exchange for code that assumes everything it needs.');

    // ═══ ACT 7: Deoptimization ═══
    s(7, 'Deoptimization', { tier: 2, compiled: [1, 2], counter: 120001, emitted: 'optimized', guardFail: true,
        types: [{ t: 'Smi', n: 120000 }, { t: 'String', n: 1, bad: true }], shape: 'polymorphic',
        caption: 'sum([1, 2, "seven"]) — the assumption just broke' },
        'Then someone calls sum() with an array containing a string. The guard compares the array\'s shape, sees it is no longer a packed integer array, and takes the bail-out branch. This is not an error — it is the mechanism working exactly as designed. The bet was reasonable; it simply lost.');
    s(7, 'Deoptimization', { tier: 0, compiled: [1], counter: 120001, emitted: 'bytecode', deopt: true,
        types: [{ t: 'Smi', n: 120000 }, { t: 'String', n: 1, bad: true }], shape: 'polymorphic',
        caption: 'reconstruct an interpreter frame mid-execution and resume there' },
        'What follows is the genuinely hard part. The optimized frame has values in registers, unboxed, with intermediate steps that no longer exist as separate operations. The engine has to reconstruct the interpreter frame that *would* have existed at this exact bytecode offset and resume there, without the program noticing anything. Engines record deoptimization metadata alongside the optimized code purely to make this possible.');
    s(7, 'Deoptimization', { tier: 0, compiled: [1], counter: 400, emitted: 'bytecode',
        types: [{ t: 'Smi', n: 380 }, { t: 'String', n: 20 }], shape: 'polymorphic',
        caption: 'profile afresh — and this time speculate less aggressively' },
        'Execution continues in the interpreter, collecting a fresh profile that now includes strings. If the function stays hot it will be recompiled — with weaker assumptions. The pathology to know about is the deopt loop: code that repeatedly gets optimized, deoptimized, and reoptimized, paying compilation cost over and over and never keeping the fast code. Engines eventually give up and mark such a site as not worth optimizing. In practice this is what a monomorphic function turning polymorphic does to a hot path.');

    // ═══ ACT 8: Warmup ═══
    s(8, 'Warmup', { curve: true, show: ['interp', 'aot', 'jit'], note: 'slow start, then steps up as each tier lands' },
        'Now the whole picture. The JIT starts near interpreter speed, steps up when tier 1 lands, and steps up again at tier 2 — eventually reaching, and sometimes exceeding, AOT-compiled throughput. Exceeding, because the JIT knows things the static compiler could not: actual types, actual branch outcomes, actual call targets.');
    s(8, 'Warmup', { curve: true, show: ['interp', 'jit'], note: 'the shaded early region is why short-lived processes struggle' },
        'But the early region is real, and it has real consequences. A process that exits before warming up gets interpreter performance and pays profiling overhead on top. This is exactly why JVM benchmarks insist on warmup iterations, why short-lived CLI tools written on JIT runtimes feel sluggish, and why serverless cold starts are such a persistent problem for JIT languages.');
    s(8, 'Warmup', { curve: true, show: ['interp', 'aot', 'jit'], note: 'which runtime wins depends entirely on how long the process lives' },
        'Which is why the workarounds all attack that region specifically. Snapshots and code caches let an engine skip re-parsing. Tiered compilation exists to shrink the gap. GraalVM native-image and CRaC compile or restore ahead of time, trading peak throughput for instant startup. There is no universal winner — a long-running server and a 50 ms CLI invocation genuinely want opposite designs.');
    s(8, 'Warmup', {
        recap: true,
        wins: [
            { t: 'Compile late, know more', d: 'The JIT sees real types and real branches. An AOT compiler must handle every case it cannot rule out statically.' },
            { t: 'Tiers are bet sizing', d: 'Cheap baseline code for warm functions; expensive optimization only where the counter proves it pays off.' },
            { t: 'Speculate, then guard', d: 'Assume the profiled type as fact and emit a cheap check. One predicted branch buys unboxed, inlined, bounds-check-free code.' },
            { t: 'Deopt is the safety net', d: 'A failed guard rebuilds an interpreter frame mid-execution. Repeated deopt loops are a real, diagnosable performance bug.' },
        ],
    }, 'That is a JIT end to end: interpret immediately while profiling, promote hot code through cheap then expensive tiers, speculate on what the profile observed, guard the speculation, and deoptimize gracefully when reality disagrees. It explains a lot of otherwise strange advice — why benchmarks need warmup, why keeping object shapes stable matters so much in JavaScript, why megamorphic call sites are slow, and why the same language can be both slower and faster than C depending entirely on how long you let it run.');

    return steps;
}

// ── Router ──────────────────────────────────────────────────────────────────────
function VisualizationPanel({ step }) {
    if (!step) return null;
    if (step.recap) return <RecapCards wins={step.wins} />;
    if (step.curve) return <CurveScene show={step.show} note={step.note} />;
    return <JitStage step={step} />;
}

// ── Quiz ────────────────────────────────────────────────────────────────────────
const QUIZ = [
    {
        question: 'What information does a JIT have that an ahead-of-time compiler fundamentally cannot?',
        options: [
            'The CPU model it is running on',
            'The actual types, branch outcomes and call targets the code produced on real input',
            'The total size of the source file',
            'Which functions the programmer marked as hot',
        ],
        correct: 1,
        explanation: 'Because it compiles while the program runs, a JIT can observe what actually happened — this element access has been a small integer 40,000 times, this branch is never taken, this call always lands on the same function. An AOT compiler must emit code that handles everything it cannot rule out statically. That observed profile is what makes speculative optimization possible.',
    },
    {
        question: 'Why do engines use multiple compilation tiers instead of always producing the best code?',
        options: [
            'Because the optimizing compiler cannot handle all bytecode',
            'To reduce memory usage of the compiler',
            'Because optimizing is expensive — spending milliseconds of CPU on a function that runs briefly is a net loss, so cheap code is used until a counter proves the function is worth more',
            'Because the interpreter cannot collect type feedback at higher tiers',
        ],
        correct: 2,
        explanation: 'Optimization costs real CPU time, taken from the running program. Tiering is bet sizing: interpret first (free), compile generic baseline code once a function is warm (cheap), and only invoke the expensive optimizing compiler when the counter shows the function is genuinely hot enough to repay it.',
    },
    {
        question: 'A hot function that was monomorphic starts receiving a second argument type. What happens?',
        options: [
            'The optimized code silently handles it, since machine code is type-agnostic',
            'The program throws a type error',
            'The guard fails, the engine deoptimizes back to the interpreter by reconstructing a frame, re-profiles, and may recompile with weaker assumptions',
            'The engine permanently disables the JIT for the whole program',
        ],
        correct: 2,
        explanation: 'The optimized code was compiled assuming a specific shape, protected by a cheap guard. When the guard fails the engine must rebuild the interpreter frame that would have existed at that bytecode offset — using recorded deoptimization metadata — and resume there. The function re-profiles and may be recompiled less aggressively. Repeated cycles of this are the "deopt loop" performance pathology.',
    },
];

function QuizPanel({ quizState, setQuizState }) {
    const q = QUIZ[quizState.current];
    if (quizState.complete) {
        return (
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-5 text-center">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{QUIZ.length}</div>
                <div className="text-zinc-400 text-sm mb-4">
                    {quizState.score === QUIZ.length ? 'Perfect — you can read --trace-deopt output now!' : 'Review the explanations to reinforce the tiers.'}
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

// ── Page ────────────────────────────────────────────────────────────────────────
const STEPS = generateSteps();

export default function JitCompilationPage() {
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
                            <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">JIT Compilation</h1>
                            <p className="text-zinc-300 text-sm mt-1">
                                Profiling counters, tiered compilation, inline caches, speculative optimization — and what happens when a guard fails
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

            {/* Main layout */}
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
                            <div className="px-5 py-3 min-h-[440px] flex items-center">
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
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-3">JIT machinery</p>
                            <div className="space-y-1.5 text-xs">
                                {[
                                    { acts: [1, 8], label: 'Warmup',      note: 'slow → fast' },
                                    { acts: [2],    label: 'Profiling',   note: 'counters + types' },
                                    { acts: [3],    label: 'Threshold',   note: 'marks code hot' },
                                    { acts: [4],    label: 'Tiers',       note: 'baseline → optimizing' },
                                    { acts: [5],    label: 'Inline cache', note: 'mono → poly → mega' },
                                    { acts: [6],    label: 'Speculation', note: 'assume + guard' },
                                    { acts: [7],    label: 'Deopt',       note: 'rebuild interp frame' },
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
