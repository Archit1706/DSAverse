"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info,
    Gauge, Layers, Grid3x3, Zap, MemoryStick, Boxes, Table2, CheckCircle,
} from 'lucide-react';

// ── Acts ──────────────────────────────────────────────────────────────────────
const ACTS = [
    { id: 1, label: 'Speed Gap',   icon: Gauge      },
    { id: 2, label: 'Hierarchy',   icon: Layers     },
    { id: 3, label: 'Cache Lines', icon: Grid3x3    },
    { id: 4, label: 'Cache Hit',   icon: Zap        },
    { id: 5, label: 'Cache Miss',  icon: MemoryStick},
    { id: 6, label: 'Locality',    icon: Boxes      },
    { id: 7, label: 'Row vs Col',  icon: Table2     },
    { id: 8, label: 'Fast Code',   icon: CheckCircle},
];

// ── Pipeline geometry ───────────────────────────────────────────────────────────
const LEVELS = [
    { id: 'cpu', label: 'CPU', sub: 'core',            x: 20,  w: 78,  cx: 59  },
    { id: 'l1',  label: 'L1',  sub: '32 KB · ~4c',     x: 140, w: 96,  cx: 188 },
    { id: 'l2',  label: 'L2',  sub: '256 KB · ~12c',   x: 280, w: 96,  cx: 328 },
    { id: 'l3',  label: 'L3',  sub: '8 MB · ~40c',     x: 420, w: 96,  cx: 468 },
    { id: 'ram', label: 'RAM', sub: '16 GB · ~200c',   x: 580, w: 150, cx: 655 },
];
const ANCHOR = { cpu: [59, 85], l1: [188, 85], l2: [328, 85], l3: [468, 85], ram: [655, 85] };
const WIRES = [
    { id: 'c1', x1: 98,  x2: 140 },
    { id: '12', x1: 236, x2: 280 },
    { id: '23', x1: 376, x2: 420 },
    { id: '3r', x1: 516, x2: 580 },
];
const MAT_R = 5, MAT_C = 8;   // matrix: 5 rows × 8 cols (each row = one 64-byte line)

// ── Persistent animated stage ───────────────────────────────────────────────────
function CacheStage({ step }) {
    const [tx, ty] = step.token ? ANCHOR[step.token] : [-60, -60];
    const missed = step.missed || [];

    const boxFill = (id) => {
        if (step.hit === id) return { fill: '#14532d', stroke: '#22c55e' };
        if (missed.includes(id)) return { fill: '#3a0d0d', stroke: '#ef4444' };
        if (step.active === id) return { fill: '#3f3f46', stroke: '#e4e4e7' };
        if (id === 'ram') return { fill: '#0f172a', stroke: '#334155' };
        return { fill: '#1e293b', stroke: '#334155' };
    };
    const wireOn = id => step.activeWire === id;

    return (
        <svg viewBox="0 0 760 400" width="100%" className="max-h-[420px] select-none">
            <style>{`
                .cc-flow { stroke-dasharray: 6 5; animation: ccdash 0.55s linear infinite; }
                @keyframes ccdash { to { stroke-dashoffset: -22; } }
                .cc-box  { transition: fill .4s ease, stroke .4s ease; }
                .cc-cell { transition: fill .4s ease, stroke .4s ease, opacity .4s ease; }
                .cc-fade { transition: opacity .5s ease; }
            `}</style>
            <defs>
                <marker id="ccah" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="userSpaceOnUse">
                    <path d="M0,0 L6,3 L0,6 Z" fill="context-stroke" />
                </marker>
            </defs>

            {/* distance = latency caption */}
            <text x="59"  y="24" textAnchor="middle" fontSize="10" fill="#22c55e" fontFamily="monospace">fast · tiny</text>
            <text x="655" y="24" textAnchor="middle" fontSize="10" fill="#f97316" fontFamily="monospace">slow · huge</text>

            {/* wires */}
            {WIRES.map(w => (
                <line key={w.id} x1={w.x1} y1="85" x2={w.x2} y2="85"
                    stroke={wireOn(w.id) ? '#e4e4e7' : '#334155'} strokeWidth="2"
                    markerEnd="url(#ccah)" className={wireOn(w.id) ? 'cc-flow' : ''} />
            ))}

            {/* level boxes */}
            {LEVELS.map(lv => {
                const st = boxFill(lv.id);
                return (
                    <g key={lv.id}>
                        <rect x={lv.x} y="45" width={lv.w} height="80" rx="9" className="cc-box"
                            fill={st.fill} stroke={st.stroke} strokeWidth={step.active === lv.id || step.hit === lv.id || missed.includes(lv.id) ? 2.2 : 1.4} />
                        <text x={lv.cx} y="80" textAnchor="middle" fontSize="16" fontWeight="bold"
                            fill={step.hit === lv.id ? '#bbf7d0' : missed.includes(lv.id) ? '#fca5a5' : '#e2e8f0'} fontFamily="monospace">{lv.label}</text>
                        <text x={lv.cx} y="102" textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="monospace">{lv.sub}</text>
                        {step.hit === lv.id && <text x={lv.cx} y="140" textAnchor="middle" fontSize="10" fill="#22c55e" fontFamily="monospace">HIT ✓</text>}
                        {missed.includes(lv.id) && <text x={lv.cx} y="140" textAnchor="middle" fontSize="10" fill="#ef4444" fontFamily="monospace">miss ✕</text>}
                    </g>
                );
            })}

            {/* ── Line strip (acts 3, 5, 6) ── */}
            {step.strip && (
                <g className="cc-fade">
                    <text x="380" y="205" textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="monospace">
                        one 64-byte cache line = 8 × 8-byte doubles
                    </text>
                    {Array.from({ length: 8 }).map((_, i) => {
                        const mode = step.strip;
                        const loaded = mode === 'load' || mode === 'first' || mode === 'hits';
                        const hit = mode === 'hits';
                        const fill = hit ? '#14532d' : loaded ? '#1e293b' : '#0f172a';
                        const stroke = hit ? '#22c55e' : loaded ? '#475569' : '#1e293b';
                        const delay = mode === 'hits' ? i * 80 : mode === 'load' ? i * 55 : 0;
                        return (
                            <g key={i} className="cc-cell" style={{ transitionDelay: `${delay}ms` }}>
                                <rect x={140 + i * 62} y="225" width="56" height="50" rx="6" fill={fill} stroke={stroke} strokeWidth="1.6" />
                                <text x={168 + i * 62} y="248" textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="monospace">arr[{i}]</text>
                                <text x={168 + i * 62} y="264" textAnchor="middle" fontSize="10" fontWeight="bold"
                                    fill={hit ? '#bbf7d0' : loaded ? '#cbd5e1' : '#475569'} fontFamily="monospace">{hit ? 'hit' : loaded ? '·' : '?'}</text>
                            </g>
                        );
                    })}
                    {step.strip === 'hits' && <text x="380" y="300" textAnchor="middle" fontSize="11" fill="#22c55e" fontFamily="monospace">1 miss loaded the line → next 7 accesses are free hits</text>}
                </g>
            )}

            {/* ── Matrix (act 7) ── */}
            {step.matrix && (() => {
                const cw = 42, ch = 30, ox = 210, oy = 190;
                const cells = [];
                for (let r = 0; r < MAT_R; r++) for (let c = 0; c < MAT_C; c++) {
                    const rowMajorIdx = r * MAT_C + c;
                    const colMajorIdx = c * MAT_R + r;
                    let fill = '#1e293b', stroke = '#334155', delay = 0;
                    if (step.matrix === 'layout') {
                        fill = r % 2 === 0 ? '#1e293b' : '#172033';
                        stroke = '#334155';
                        delay = rowMajorIdx * 14;
                    } else if (step.matrix === 'row') {
                        const isMiss = c === 0;
                        fill = isMiss ? '#3a2a0d' : '#14532d';
                        stroke = isMiss ? '#f59e0b' : '#22c55e';
                        delay = rowMajorIdx * 32;
                    } else { // col
                        fill = '#3a0d0d'; stroke = '#ef4444';
                        delay = colMajorIdx * 32;
                    }
                    cells.push(
                        <g key={`${r}-${c}`} className="cc-cell" style={{ transitionDelay: `${delay}ms` }}>
                            <rect x={ox + c * cw} y={oy + r * ch} width={cw - 3} height={ch - 3} rx="3" fill={fill} stroke={stroke} strokeWidth="1.2" />
                        </g>
                    );
                }
                return (
                    <g className="cc-fade">
                        <text x={ox + (MAT_C * cw) / 2} y={oy - 12} textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="monospace">
                            matrix[{MAT_R}][{MAT_C}] — stored row by row in memory →
                        </text>
                        {cells}
                        {step.matrix === 'row' && (
                            <text x={ox + (MAT_C * cw) / 2} y={oy + MAT_R * ch + 22} textAnchor="middle" fontSize="12" fill="#22c55e" fontFamily="monospace">
                                row-major: walks along memory → 5 misses / 40 (mostly hits)
                            </text>
                        )}
                        {step.matrix === 'col' && (
                            <text x={ox + (MAT_C * cw) / 2} y={oy + MAT_R * ch + 22} textAnchor="middle" fontSize="12" fill="#ef4444" fontFamily="monospace">
                                column-major: jumps a full row each step → 40 misses / 40 (every access!)
                            </text>
                        )}
                        {step.matrix === 'layout' && (
                            <text x={ox + (MAT_C * cw) / 2} y={oy + MAT_R * ch + 22} textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="monospace">
                                each row (8 elements) fits in one 64-byte cache line
                            </text>
                        )}
                    </g>
                );
            })()}

            {/* moving token */}
            <g style={{ transform: `translate(${tx}px, ${ty}px)`, transition: 'transform 0.7s cubic-bezier(0.45,0,0.15,1)' }}>
                <g style={{ opacity: step.token ? 1 : 0, transition: 'opacity .3s ease' }}>
                    <circle r="16" fill={step.tokenColor === 'ok' ? '#15803d' : step.tokenColor === 'miss' ? '#b45309' : '#0369a1'} stroke="#e2e8f0" strokeWidth="1.6" />
                    <text y="4" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#f8fafc" fontFamily="monospace">{step.tokenLabel || ''}</text>
                </g>
            </g>
        </svg>
    );
}

// ── Latency ladder (Act 1) ───────────────────────────────────────────────────────
const LADDER = [
    { name: 'Register', cyc: '< 1 cycle',  human: '≈ 1 second',    w: 5,   color: '#22c55e' },
    { name: 'L1 cache', cyc: '~4 cycles',  human: '≈ 2 seconds',   w: 11,  color: '#4ade80' },
    { name: 'L2 cache', cyc: '~12 cycles', human: '≈ 6 seconds',   w: 20,  color: '#a3e635' },
    { name: 'L3 cache', cyc: '~40 cycles', human: '≈ 20 seconds',  w: 34,  color: '#facc15' },
    { name: 'Main RAM', cyc: '~200 cycles',human: '≈ 1.5 minutes', w: 58,  color: '#f97316' },
    { name: 'SSD',      cyc: '~100 µs',    human: '≈ 1.5 days',    w: 82,  color: '#ef4444' },
    { name: 'HDD seek', cyc: '~10 ms',     human: '≈ 8 months',    w: 100, color: '#dc2626' },
];
function LadderScene({ emphasizeHuman }) {
    return (
        <div className="w-full py-2">
            <div className="flex justify-between text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2 px-1">
                <span>where the data is</span><span>{emphasizeHuman ? 'if 1 cycle = 1 second…' : 'latency'}</span>
            </div>
            <div className="space-y-2">
                {LADDER.map((r, i) => (
                    <div key={r.name} className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 w-20 shrink-0 text-right font-mono">{r.name}</span>
                        <div className="flex-1 bg-slate-900/60 rounded-lg h-7 overflow-hidden">
                            <div className="h-full rounded-lg flex items-center px-2 transition-all duration-700"
                                style={{ width: `${r.w}%`, background: r.color, transitionDelay: `${i * 90}ms` }}>
                                <span className="text-[10px] font-mono font-bold text-slate-950 whitespace-nowrap">{emphasizeHuman ? r.human : r.cyc}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <p className="text-[11px] text-slate-600 text-center mt-3 font-mono">the gap between L1 and RAM is ~50×, between RAM and disk ~1000×+</p>
        </div>
    );
}

// ── Recap (Act 8) ─────────────────────────────────────────────────────────────────
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

    // ═══ ACT 1: The Speed Gap ═══
    s(1, 'The Speed Gap', { ladder: true },
        'A modern CPU core executes billions of instructions per second — a single clock cycle is under a nanosecond. But main RAM takes ~100 ns to answer, which is ~200+ cycles. If the CPU had to wait on RAM for every access, it would spend almost all its time stalled, twiddling its thumbs. Caches exist to close this gap.');
    s(1, 'The Speed Gap', { ladder: true, emphasizeHuman: true },
        'Scale one cycle up to one second and the distances become human. Your L1 cache is a note on your desk (a second away); RAM is a walk down the hall (a minute and a half); an SSD is a trip that takes over a day; a spinning disk seek is months. The entire memory hierarchy is an elaborate scheme to keep the data you need close, in the fast tiers.');

    // ═══ ACT 2: The Hierarchy ═══
    s(2, 'The Hierarchy', {},
        'So chips stack small, fast caches between the core and RAM. L1 is tiny (~32 KB) but answers in ~4 cycles. L2 is bigger (~256 KB) and slower. L3 is shared across cores (several MB) and slower still. Each level trades size for speed — a classic pyramid. RAM sits at the bottom: enormous, but ~50× slower than L1.');
    s(2, 'The Hierarchy', { active: 'l1' },
        'On every memory access the core asks L1 first. If L1 does not have it, it asks L2; then L3; and only if all three miss does it pay the full trip to RAM. Each cache is a fallback for the one above it. The whole art of fast code is keeping your working data small and reused enough to live in these upper tiers.');

    // ═══ ACT 3: Cache Lines ═══
    s(3, 'Cache Lines', { strip: 'first' },
        'Caches never move single bytes. Memory is transferred in fixed blocks called cache lines — almost universally 64 bytes. Here that is 8 consecutive 8-byte doubles. The line is the atomic unit: the smallest thing a cache can hold or fetch.');
    s(3, 'Cache Lines', { strip: 'load' },
        'This has a profound consequence: when you touch a single byte that is not cached, the hardware fetches its entire 64-byte line — all 8 doubles here — not just the one you asked for. You pay for the whole line whether you use it or not. Whether that is waste or a gift depends entirely on your access pattern, as we will see.');

    // ═══ ACT 4: Cache Hit ═══
    s(4, 'Cache Hit', { token: 'cpu', tokenLabel: 'load', tokenColor: 'req' },
        'Let us watch a read. The core needs the value at some address and issues a load. The request heads to the closest, fastest cache first — L1. Follow the token.');
    s(4, 'Cache Hit', { token: 'l1', tokenColor: 'req', active: 'l1', activeWire: 'c1' },
        'The token reaches L1, which checks whether it holds the line for that address. It does — a cache hit.');
    s(4, 'Cache Hit', { token: 'l1', tokenColor: 'ok', hit: 'l1' },
        'L1 returns the data in about 4 cycles and the core continues almost without pausing. This is the case you want the overwhelming majority of the time. Real programs hit L1 well over 90% of the time — which is the only reason CPUs are not permanently stalled on memory.');

    // ═══ ACT 5: Cache Miss ═══
    s(5, 'Cache Miss', { token: 'l1', tokenColor: 'miss', missed: ['l1'], active: 'l1', activeWire: 'c1' },
        'Now an address that is not cached. The token checks L1 — miss. The line is not here. The request cascades down to the next level.');
    s(5, 'Cache Miss', { token: 'l3', tokenColor: 'miss', missed: ['l1', 'l2', 'l3'], activeWire: '23' },
        'L2 — miss. L3 — miss. Every level was checked and came up empty (each check adds latency). With nowhere left to look in cache, the request must go all the way to main RAM.');
    s(5, 'Cache Miss', { token: 'ram', tokenColor: 'miss', active: 'ram', activeWire: '3r', strip: 'load' },
        'RAM has it — but the penalty is ~200 cycles, during which the core largely stalls. RAM does not send back one value; it sends the whole 64-byte line, which is copied into L3, then L2, then L1 on the way up (watch the line fill below). Future accesses to anything in this line will now be fast.');
    s(5, 'Cache Miss', { token: 'l1', tokenColor: 'ok', hit: 'l1', strip: 'load' },
        'Finally the value is delivered from L1 and the core resumes. That one miss cost ~50× a hit. A program dominated by misses runs at a fraction of the CPU\'s potential, no matter how clever the algorithm — the core is just waiting on memory.');

    // ═══ ACT 6: Spatial Locality ═══
    s(6, 'Spatial Locality', { strip: 'load' },
        'Here is where the whole-line fetch turns into a gift. Suppose we walk an array sequentially: arr[0], arr[1], arr[2], … The first access, arr[0], misses and loads the full line — all 8 elements — into cache.');
    s(6, 'Spatial Locality', { strip: 'hits' },
        'Now arr[1] through arr[7] are already sitting in that cached line. Seven consecutive hits, essentially free (watch them light up). One expensive miss was amortized across eight accesses. This is spatial locality: data near what you just used is likely to be used soon, and the cache line delivers exactly that neighborhood.');
    s(6, 'Spatial Locality', { strip: 'hits' },
        'This is why sequential access screams and why contiguous data structures (arrays, std::vector) crush pointer-chasing ones (linked lists, trees of scattered nodes) in practice — even at the same Big-O. The array\'s neighbors ride along for free in the line; the linked list\'s next node is a random address that misses every time.');

    // ═══ ACT 7: Row vs Column ═══
    s(7, 'Row-major vs Column-major', { matrix: 'layout' },
        'The classic demonstration. A 2D array is stored in memory one row after another (row-major, as in C, C++, and NumPy by default). So the 8 elements of a row are contiguous — each row here fits in exactly one 64-byte cache line. The layout is fixed; what changes everything is the order you traverse it.');
    s(7, 'Row-major vs Column-major', { matrix: 'row' },
        'Traverse row-major — for each row, sweep across its columns. You walk straight along memory. The first element of each row misses and loads the line; the next 7 are hits. Just 5 misses across 40 accesses. The fill cascades in exactly the order the CPU touches memory. This is cache-friendly.');
    s(7, 'Row-major vs Column-major', { matrix: 'col' },
        'Now swap the loop order — traverse column-major, going down a column. Each step jumps a full row ahead in memory (a stride of 8), landing in a different cache line every single time. Every access misses. 40 misses out of 40. Same data, same total work, same O(n) — but this loop can run several times slower purely because it fights the cache.');
    s(7, 'Row-major vs Column-major', { matrix: 'col' },
        'The fix is often just swapping two loop lines so the inner loop runs along rows, not down columns. Matrix libraries go further with cache blocking (tiling) — processing sub-blocks that fit entirely in cache. The lesson: with big data, memory access pattern can matter more than instruction count.');

    // ═══ ACT 8: Fast Code ═══
    s(8, 'Cache-Friendly Code', {
        recap: true,
        wins: [
            { t: 'Access sequentially', d: 'Walk memory in order so each loaded line is fully used before the next miss.' },
            { t: 'Prefer contiguous structures', d: 'Arrays / vectors beat linked lists & scattered trees — neighbors ride along in the line.' },
            { t: 'Mind the loop order', d: 'Iterate row-major on row-major data; a swapped inner loop can be several× faster.' },
            { t: 'Keep the working set small', d: 'Data that fits in L1/L2 and gets reused stays in the fast tiers (blocking / tiling).' },
        ],
    }, 'Caches are automatic — you never manage them directly — but you decide how friendly your code is to them. Access data sequentially, keep it contiguous, match your loop order to the memory layout, and shrink the working set so it stays in L1/L2. Do that and the hardware rewards you with hits; ignore it and even an optimal algorithm crawls while the core waits on RAM. Same Big-O, wildly different wall-clock.');

    return steps;
}

// ── Router ──────────────────────────────────────────────────────────────────────
function VisualizationPanel({ step }) {
    if (!step) return null;
    if (step.ladder) return <LadderScene emphasizeHuman={step.emphasizeHuman} />;
    if (step.recap)  return <RecapCards wins={step.wins} />;
    return <CacheStage step={step} />;
}

// ── Quiz ──────────────────────────────────────────────────────────────────────
const QUIZ = [
    {
        question: 'When the CPU reads one uncached byte, how much does the hardware actually fetch?',
        options: [
            'Exactly that one byte',
            'The entire 64-byte cache line containing it',
            'The whole 4 KB memory page',
            'All of L1 is refilled',
        ],
        correct: 1,
        explanation: 'Caches operate on fixed-size cache lines (typically 64 bytes). Touching one byte pulls its whole line into cache. This is why sequential access is fast — the neighbors come along for free — and why stride-heavy access wastes most of each line.',
    },
    {
        question: 'Why does iterating a 2D array column-major (in a row-major language) often run far slower than row-major, despite identical Big-O?',
        options: [
            'Column-major does more arithmetic',
            'It uses more registers',
            'Each step strides a full row ahead, landing in a new cache line every time → a miss on nearly every access',
            'The compiler refuses to optimize it',
        ],
        correct: 2,
        explanation: 'Row-major storage makes a row contiguous. Walking down a column jumps by a full row (a large stride) each step, so almost every access falls in a different cache line and misses. Row-major traversal reuses each loaded line across the whole row. Same operations, very different cache behavior.',
    },
    {
        question: 'Roughly how much slower is a main-RAM access than an L1 cache hit?',
        options: ['About the same', 'Around 2×', 'Around 50×', 'Around 10,000×'],
        correct: 2,
        explanation: 'An L1 hit is ~4 cycles; a RAM access is ~200 cycles — on the order of 50× slower. (Disk is another ~1000×+ beyond RAM.) That gap is why keeping the working set in cache, via locality, dominates real-world performance.',
    },
];

function QuizPanel({ quizState, setQuizState }) {
    const q = QUIZ[quizState.current];
    if (quizState.complete) {
        return (
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-5 text-center">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{QUIZ.length}</div>
                <div className="text-zinc-400 text-sm mb-4">
                    {quizState.score === QUIZ.length ? 'Perfect — you think in cache lines now!' : 'Review the explanations to reinforce the concepts.'}
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

export default function CpuCacheHierarchyPage() {
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
                            <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">CPU Cache Hierarchy</h1>
                            <p className="text-zinc-300 text-sm mt-1">
                                L1/L2/L3, cache lines, hits vs misses, spatial locality — and why loop order can make identical code run several× slower
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
                            <div className="px-5 py-3 min-h-[420px] flex items-center">
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

                        {/* Latency reference */}
                        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-3">Access latency</p>
                            <div className="space-y-1.5 text-xs">
                                {[
                                    { acts: [2, 4], label: 'L1 hit', note: '~4 cycles' },
                                    { acts: [2], label: 'L2 hit', note: '~12 cycles' },
                                    { acts: [2], label: 'L3 hit', note: '~40 cycles' },
                                    { acts: [5], label: 'RAM (miss)', note: '~200 cycles' },
                                    { acts: [3, 6], label: 'Cache line', note: '64 bytes' },
                                    { acts: [7], label: 'Loop order', note: 'hits vs misses' },
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
