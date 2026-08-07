"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info,
    ShieldAlert, Ban, ArrowDownToLine, RefreshCw, Cog, CornerUpLeft, Gauge, Boxes,
} from 'lucide-react';

// ── Acts ──────────────────────────────────────────────────────────────────────
const ACTS = [
    { id: 1, label: 'Two Rings',  icon: ShieldAlert     },
    { id: 2, label: 'The Wall',   icon: Ban             },
    { id: 3, label: 'The Trap',   icon: ArrowDownToLine },
    { id: 4, label: 'Mode Switch', icon: RefreshCw      },
    { id: 5, label: 'In Kernel',  icon: Cog             },
    { id: 6, label: 'Return',     icon: CornerUpLeft    },
    { id: 7, label: 'The Cost',   icon: Gauge           },
    { id: 8, label: 'Batching',   icon: Boxes           },
];

// ── Stage geometry ─────────────────────────────────────────────────────────────
const BOUNDARY_Y = 192;
const BOXES = {
    code:    { x: 32,  y: 50,  w: 330, h: 116, title: 'your program — ring 3' },
    regs:    { x: 378, y: 50,  w: 170, h: 116, title: 'registers' },
    result:  { x: 564, y: 50,  w: 164, h: 116, title: 'return value' },
    entry:   { x: 32,  y: 216, w: 160, h: 56,  title: 'syscall entry' },
    table:   { x: 212, y: 212, w: 180, h: 112, title: 'syscall table' },
    handler: { x: 412, y: 216, w: 160, h: 56,  title: 'sys_write()' },
    kstack:  { x: 592, y: 216, w: 136, h: 56,  title: 'kernel stack' },
    hw:      { x: 430, y: 356, w: 300, h: 50,  title: 'disk / device driver' },
};
const ANCHOR = {
    user:    [197, 172],
    entry:   [112, 244],
    table:   [302, 268],
    handler: [492, 244],
    hw:      [585, 381],
    back:    [646, 150],
};
const WIRES = [
    { id: 'trap',   d: 'M197,170 L112,212' },
    { id: 'disp',   d: 'M190,250 L208,262' },
    { id: 'call',   d: 'M394,262 L408,248' },
    { id: 'io',     d: 'M500,274 L570,352' },
    { id: 'ret',    d: 'M566,232 L646,172' },
];

const SYSCALL_TABLE = [
    { n: 0,   name: 'sys_read' },
    { n: 1,   name: 'sys_write' },
    { n: 2,   name: 'sys_open' },
    { n: 3,   name: 'sys_close' },
    { n: 60,  name: 'sys_exit' },
];

// ── Persistent animated stage ──────────────────────────────────────────────────
function KernelStage({ step }) {
    const [tx, ty] = step.token ? ANCHOR[step.token] : [-80, -80];
    const hot = step.active || [];
    const isHot = id => hot.includes(id);

    const panel = (key, extra = {}) => {
        const b = BOXES[key];
        const on = isHot(key);
        return (
            <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="9" className="sc-box"
                fill={on ? '#3f3f46' : extra.fill || '#1e293b'}
                stroke={on ? '#e4e4e7' : extra.stroke || '#334155'}
                strokeWidth={on ? 2.2 : 1.4} />
        );
    };

    return (
        <svg viewBox="0 0 760 430" width="100%" className="max-h-[430px] select-none">
            <style>{`
                .sc-flow { stroke-dasharray: 6 5; animation: scdash 0.55s linear infinite; }
                @keyframes scdash { to { stroke-dashoffset: -22; } }
                .sc-box  { transition: fill .4s ease, stroke .4s ease, stroke-width .4s ease; }
                .sc-fade { transition: opacity .5s ease; }
                .sc-row  { transition: fill .35s ease, opacity .35s ease; }
                .sc-grow { transition: width .6s cubic-bezier(.45,0,.15,1), fill .5s ease; }
            `}</style>
            <defs>
                <marker id="scah" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="userSpaceOnUse">
                    <path d="M0,0 L6,3 L0,6 Z" fill="context-stroke" />
                </marker>
            </defs>

            {/* ── Bands ── */}
            <rect x="20" y="38" width="720" height="140" rx="12" fill="#020617" stroke="#1e293b" strokeWidth="1.2" />
            <rect x="20" y="204" width="720" height="132" rx="12" fill="#0c0a14" stroke="#3f1d1d" strokeWidth="1.2" />

            {/* ── Privilege boundary ── */}
            <line x1="20" y1={BOUNDARY_Y} x2="740" y2={BOUNDARY_Y}
                stroke={step.blocked ? '#ef4444' : '#f59e0b'} strokeWidth={step.blocked ? 3 : 2} strokeDasharray="9 6" className="sc-box" />
            <text x="30" y={BOUNDARY_Y - 7} fontSize="10" fill="#64748b" fontFamily="monospace">ring 3 · user mode — no direct hardware access</text>
            <text x="730" y={BOUNDARY_Y + 15} textAnchor="end" fontSize="10" fill="#b45309" fontFamily="monospace">ring 0 · kernel mode — full privilege</text>
            <text x="380" y={BOUNDARY_Y - 7} textAnchor="middle" fontSize="10" fontWeight="bold"
                fill={step.blocked ? '#ef4444' : '#f59e0b'} fontFamily="monospace">privilege boundary</text>

            {/* ── Wires ── */}
            {WIRES.map(w => (
                <path key={w.id} d={w.d} fill="none"
                    stroke={step.wire === w.id ? '#e4e4e7' : '#334155'} strokeWidth="2"
                    markerEnd="url(#scah)" className={step.wire === w.id ? 'sc-flow' : ''} />
            ))}

            {/* ── User space: code panel ── */}
            {panel('code')}
            <text x={BOXES.code.x + 10} y={BOXES.code.y + 16} fontSize="9" fill="#64748b" fontFamily="monospace">{BOXES.code.title}</text>
            {(step.code || []).map((line, i) => (
                <g key={i}>
                    {step.activeLine === i && (
                        <rect x={BOXES.code.x + 6} y={BOXES.code.y + 24 + i * 17} width={BOXES.code.w - 12} height={16} rx="3"
                            fill="#3f3f46" className="sc-box" />
                    )}
                    <text x={BOXES.code.x + 12} y={BOXES.code.y + 36 + i * 17} fontSize="11" fontFamily="monospace"
                        fill={step.activeLine === i ? '#f8fafc' : '#64748b'}>{line}</text>
                </g>
            ))}

            {/* ── User space: registers ── */}
            {panel('regs')}
            <text x={BOXES.regs.x + 10} y={BOXES.regs.y + 16} fontSize="9" fill="#64748b" fontFamily="monospace">{BOXES.regs.title}</text>
            {(step.regs || []).map((r, i) => (
                <g key={r.name} className="sc-row">
                    <text x={BOXES.regs.x + 12} y={BOXES.regs.y + 38 + i * 20} fontSize="11" fontFamily="monospace"
                        fill={r.hot ? '#fcd34d' : '#94a3b8'}>{r.name}</text>
                    <text x={BOXES.regs.x + BOXES.regs.w - 12} y={BOXES.regs.y + 38 + i * 20} textAnchor="end" fontSize="11" fontFamily="monospace"
                        fill={r.hot ? '#fef3c7' : '#475569'}>{r.val}</text>
                </g>
            ))}

            {/* ── User space: result ── */}
            {panel('result')}
            <text x={BOXES.result.x + 10} y={BOXES.result.y + 16} fontSize="9" fill="#64748b" fontFamily="monospace">{BOXES.result.title}</text>
            {step.result ? (
                <g className="sc-fade">
                    <text x={BOXES.result.x + BOXES.result.w / 2} y={BOXES.result.y + 58} textAnchor="middle" fontSize="20" fontWeight="bold"
                        fill={step.resultOk === false ? '#ef4444' : '#22c55e'} fontFamily="monospace">{step.result}</text>
                    <text x={BOXES.result.x + BOXES.result.w / 2} y={BOXES.result.y + 80} textAnchor="middle" fontSize="10"
                        fill="#94a3b8" fontFamily="monospace">{step.resultNote}</text>
                </g>
            ) : (
                <text x={BOXES.result.x + BOXES.result.w / 2} y={BOXES.result.y + 62} textAnchor="middle" fontSize="12"
                    fill="#334155" fontFamily="monospace">—</text>
            )}

            {/* ── Kernel: entry ── */}
            {panel('entry', { fill: '#1a1420', stroke: '#4c1d1d' })}
            <text x={BOXES.entry.x + BOXES.entry.w / 2} y={BOXES.entry.y + 26} textAnchor="middle" fontSize="12" fontWeight="bold"
                fill={isHot('entry') ? '#fef3c7' : '#cbd5e1'} fontFamily="monospace">syscall entry</text>
            <text x={BOXES.entry.x + BOXES.entry.w / 2} y={BOXES.entry.y + 43} textAnchor="middle" fontSize="9"
                fill="#94a3b8" fontFamily="monospace">LSTAR · entry_SYSCALL_64</text>

            {/* ── Kernel: syscall table ── */}
            {panel('table', { fill: '#1a1420', stroke: '#4c1d1d' })}
            <text x={BOXES.table.x + 10} y={BOXES.table.y + 16} fontSize="9" fill="#64748b" fontFamily="monospace">{BOXES.table.title}</text>
            {SYSCALL_TABLE.map((row, i) => {
                const sel = step.tableHit === row.n;
                return (
                    <g key={row.n} className="sc-row">
                        {sel && <rect x={BOXES.table.x + 6} y={BOXES.table.y + 24 + i * 17} width={BOXES.table.w - 12} height={16} rx="3" fill="#7c2d12" />}
                        <text x={BOXES.table.x + 12} y={BOXES.table.y + 36 + i * 17} fontSize="10" fontFamily="monospace"
                            fill={sel ? '#fed7aa' : '#475569'}>{String(row.n).padStart(2, ' ')}</text>
                        <text x={BOXES.table.x + 40} y={BOXES.table.y + 36 + i * 17} fontSize="10" fontFamily="monospace"
                            fill={sel ? '#fff7ed' : '#64748b'}>{row.name}</text>
                    </g>
                );
            })}

            {/* ── Kernel: handler ── */}
            {panel('handler', { fill: '#1a1420', stroke: '#4c1d1d' })}
            <text x={BOXES.handler.x + BOXES.handler.w / 2} y={BOXES.handler.y + 26} textAnchor="middle" fontSize="12" fontWeight="bold"
                fill={isHot('handler') ? '#fef3c7' : '#cbd5e1'} fontFamily="monospace">sys_write()</text>
            <text x={BOXES.handler.x + BOXES.handler.w / 2} y={BOXES.handler.y + 43} textAnchor="middle" fontSize="9"
                fill="#94a3b8" fontFamily="monospace">{step.handlerNote || 'VFS → driver'}</text>

            {/* ── Kernel: kernel stack ── */}
            {panel('kstack', { fill: '#1a1420', stroke: '#4c1d1d' })}
            <text x={BOXES.kstack.x + BOXES.kstack.w / 2} y={BOXES.kstack.y + 22} textAnchor="middle" fontSize="10" fontWeight="bold"
                fill={isHot('kstack') ? '#fef3c7' : '#cbd5e1'} fontFamily="monospace">kernel stack</text>
            <text x={BOXES.kstack.x + BOXES.kstack.w / 2} y={BOXES.kstack.y + 40} textAnchor="middle" fontSize="9"
                fill={isHot('kstack') ? '#fde68a' : '#475569'} fontFamily="monospace">{step.saved ? 'saved RIP · RFLAGS' : 'empty'}</text>

            {/* ── Hardware ── */}
            <rect x={BOXES.hw.x} y={BOXES.hw.y} width={BOXES.hw.w} height={BOXES.hw.h} rx="9" className="sc-box"
                fill={isHot('hw') ? '#14532d' : '#0f172a'} stroke={isHot('hw') ? '#22c55e' : '#334155'} strokeWidth={isHot('hw') ? 2.2 : 1.4} />
            <text x={BOXES.hw.x + BOXES.hw.w / 2} y={BOXES.hw.y + 30} textAnchor="middle" fontSize="12" fontWeight="bold"
                fill={isHot('hw') ? '#bbf7d0' : '#64748b'} fontFamily="monospace">hardware — disk · NIC · device driver</text>

            {/* ── Blocked direct access (Act 2) ── */}
            {step.blocked && (
                <g className="sc-fade">
                    <path d="M197,170 L520,352" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="7 5" opacity="0.8" />
                    <g transform="translate(330, 246)">
                        <circle r="20" fill="#3a0d0d" stroke="#ef4444" strokeWidth="2.4" />
                        <path d="M-8,-8 L8,8 M8,-8 L-8,8" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
                    </g>
                    <text x="330" y="298" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#ef4444" fontFamily="monospace">
                        general protection fault → SIGSEGV
                    </text>
                </g>
            )}

            {/* ── Moving token ── */}
            <g style={{ transform: `translate(${tx}px, ${ty}px)`, transition: 'transform 0.7s cubic-bezier(0.45,0,0.15,1)' }}>
                <g style={{ opacity: step.token ? 1 : 0, transition: 'opacity .3s ease' }}>
                    <circle r="17" fill={step.tokenColor === 'ok' ? '#15803d' : step.tokenColor === 'kern' ? '#b45309' : '#0369a1'}
                        stroke="#e2e8f0" strokeWidth="1.6" />
                    <text y="4" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#f8fafc" fontFamily="monospace">{step.tokenLabel || ''}</text>
                </g>
            </g>

            {step.caption && (
                <text x="380" y="422" textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="monospace">{step.caption}</text>
            )}
        </svg>
    );
}

// ── Protection rings (Act 1) ────────────────────────────────────────────────────
const RINGS = [
    { r: 148, id: 'r3', label: 'Ring 3 — user mode',   sub: 'your programs, browsers, games',       fill: '#0f172a', stroke: '#475569', tcol: '#94a3b8' },
    { r: 100, id: 'r12', label: 'Rings 1 & 2',          sub: 'defined by x86, unused by Linux/Windows', fill: '#111827', stroke: '#334155', tcol: '#475569' },
    { r: 56,  id: 'r0', label: 'Ring 0 — kernel',      sub: 'scheduler, drivers, page tables',      fill: '#3a0d0d', stroke: '#ef4444', tcol: '#fca5a5' },
];
function RingsScene({ highlight, privileged }) {
    const cx = 230, cy = 214;
    return (
        <svg viewBox="0 0 760 430" width="100%" className="max-h-[430px] select-none">
            <style>{`.rg { transition: fill .5s ease, stroke .5s ease, opacity .5s ease; }`}</style>
            {RINGS.map(r => {
                const on = highlight === r.id;
                return (
                    <circle key={r.id} className="rg" cx={cx} cy={cy} r={r.r}
                        fill={r.fill} stroke={on ? '#e4e4e7' : r.stroke} strokeWidth={on ? 3 : 1.6}
                        opacity={highlight && !on ? 0.45 : 1} />
                );
            })}
            <text x={cx} y={cy + 4} textAnchor="middle" fontSize="13" fontWeight="bold" fill="#fca5a5" fontFamily="monospace">ring 0</text>
            <text x={cx} y={cy - 118} textAnchor="middle" fontSize="12" fill="#94a3b8" fontFamily="monospace">ring 3</text>

            {RINGS.map((r, i) => {
                const y = 108 + i * 52;
                const on = highlight === r.id;
                return (
                    <g key={r.id} className="rg" opacity={highlight && !on ? 0.4 : 1}>
                        <rect x={432} y={y - 18} width={296} height={40} rx="8"
                            fill={on ? '#3f3f46' : '#1e293b'} stroke={on ? '#e4e4e7' : '#334155'} strokeWidth={on ? 2 : 1.2} />
                        <text x={444} y={y - 2} fontSize="11" fontWeight="bold" fill={on ? '#f8fafc' : r.tcol} fontFamily="monospace">{r.label}</text>
                        <text x={444} y={y + 13} fontSize="9" fill="#64748b" fontFamily="monospace">{r.sub}</text>
                    </g>
                );
            })}

            {privileged && (
                <g style={{ transition: 'opacity .5s ease' }}>
                    <text x={432} y={288} fontSize="10" fill="#b45309" fontFamily="monospace">only ring 0 may:</text>
                    {[
                        'talk to devices (disk, network card, GPU)',
                        'edit page tables — hand out physical memory',
                        'mask interrupts and reprogram the timer',
                        'switch which process is on the CPU',
                    ].map((t, i) => (
                        <text key={i} x={444} y={308 + i * 18} fontSize="10" fill="#94a3b8" fontFamily="monospace">· {t}</text>
                    ))}
                </g>
            )}

            <text x={230} y={400} textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="monospace">
                the CPU itself enforces this — it is not a convention
            </text>
        </svg>
    );
}

// ── Cost comparison (Act 7) ────────────────────────────────────────────────────
function CostScene({ count }) {
    const rows = [
        { label: 'plain function call',      note: '~1 ns · stays in ring 3',            w: 3,   color: '#22c55e' },
        { label: 'system call (write)',      note: '~50–200 ns · two mode switches',     w: 34,  color: '#f59e0b' },
        { label: 'context switch to another process', note: '~1–5 µs · new page tables, cold cache', w: 100, color: '#ef4444' },
    ];
    return (
        <div className="w-full py-2">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-3 px-1">what each transition actually costs</div>
            <div className="space-y-4">
                {rows.map((r, i) => (
                    <div key={r.label} className="transition-opacity duration-500" style={{ opacity: i < count ? 1 : 0.15 }}>
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-300 font-mono">{r.label}</span>
                            <span className="font-mono text-[11px]" style={{ color: r.color }}>{r.note}</span>
                        </div>
                        <div className="h-6 rounded-lg bg-slate-900/70 overflow-hidden">
                            <div className="h-full rounded-lg transition-all duration-700"
                                style={{ width: i < count ? `${r.w}%` : '0%', background: r.color, transitionDelay: `${i * 140}ms` }} />
                        </div>
                    </div>
                ))}
            </div>
            <p className="text-[11px] text-slate-600 mt-4 font-mono leading-relaxed">
                a syscall is not just the mode switch — it also flushes pipeline state, pollutes cache and TLB, and since
                Spectre/Meltdown pays for page-table isolation on every crossing
            </p>
        </div>
    );
}

// ── Batching (Act 8) ────────────────────────────────────────────────────────────
function BatchScene({ mode }) {
    const naive = mode === 'naive';
    return (
        <div className="w-full py-2 space-y-5">
            <div className={`rounded-xl border p-4 transition-colors duration-500 ${naive ? 'border-red-500/50 bg-red-500/5' : 'border-slate-800 bg-slate-900/40'}`}>
                <div className="font-mono text-xs text-slate-300 mb-3">
                    for (int i = 0; i &lt; 1000; i++) <span className="text-slate-500">printf(&quot;%d\\n&quot;, i);</span>
                </div>
                <div className="flex flex-wrap gap-1">
                    {Array.from({ length: 40 }).map((_, i) => (
                        <div key={i} className={`h-4 w-4 rounded transition-all duration-500 ${naive ? 'bg-red-500/70' : 'bg-slate-800'}`}
                            style={{ transitionDelay: `${i * 12}ms` }} />
                    ))}
                </div>
                <div className={`text-[11px] font-mono mt-3 ${naive ? 'text-red-400' : 'text-slate-600'}`}>
                    unbuffered: 1000 printf calls → 1000 syscalls → 1000 boundary crossings
                </div>
            </div>

            <div className={`rounded-xl border p-4 transition-colors duration-500 ${!naive ? 'border-green-500/50 bg-green-500/5' : 'border-slate-800 bg-slate-900/40'}`}>
                <div className="font-mono text-xs text-slate-300 mb-3">
                    stdio buffers in <span className="text-slate-500">user space</span>, flushing at 4 KB
                </div>
                <div className="flex flex-wrap gap-1">
                    {Array.from({ length: 40 }).map((_, i) => (
                        <div key={i} className={`h-4 w-4 rounded transition-all duration-500 ${!naive && i % 10 === 0 ? 'bg-green-500/80' : 'bg-slate-800'}`}
                            style={{ transitionDelay: `${i * 12}ms` }} />
                    ))}
                </div>
                <div className={`text-[11px] font-mono mt-3 ${!naive ? 'text-green-400' : 'text-slate-600'}`}>
                    buffered: the same 1000 printfs → a handful of write() syscalls
                </div>
            </div>
        </div>
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
const C_CODE  = ['ssize_t n = write(1, buf, 13);', '', '// libc is only a thin wrapper —', '// the real work is one instruction', '// the CPU treats very specially'];
const ASM     = ['mov  rax, 1      ; __NR_write', 'mov  rdi, 1      ; fd = stdout', 'mov  rsi, buf    ; buffer address', 'mov  rdx, 13     ; byte count', 'syscall          ; <- the doorway'];
const REGS_EMPTY = [{ name: 'rax', val: '—' }, { name: 'rdi', val: '—' }, { name: 'rsi', val: '—' }, { name: 'rdx', val: '—' }];
const REGS_SET   = [
    { name: 'rax', val: '1  (write)', hot: true },
    { name: 'rdi', val: '1  (stdout)', hot: true },
    { name: 'rsi', val: '0x7ffd…', hot: true },
    { name: 'rdx', val: '13', hot: true },
];
const REGS_RET = [
    { name: 'rax', val: '13  (bytes)', hot: true },
    { name: 'rdi', val: '1', hot: false },
    { name: 'rsi', val: '0x7ffd…', hot: false },
    { name: 'rdx', val: '13', hot: false },
];

function generateSteps() {
    const steps = [];
    const s = (act, actName, data, explanation) => steps.push({ act, actName, ...data, explanation });

    // ═══ ACT 1: Two Rings ═══
    s(1, 'Two Rings', { rings: true, highlight: 'r3' },
        'Your program does not run on the hardware. It runs on top of an operating system that never lets it touch the hardware directly, and the CPU enforces that separation in silicon. x86 defines four privilege levels, called rings. Your code — every program you have ever written — lives in ring 3, the least privileged one.');
    s(1, 'Two Rings', { rings: true, highlight: 'r0' },
        'The kernel lives in ring 0, where every instruction is legal. In practice Linux and Windows use only these two levels and skip rings 1 and 2 entirely, partly because virtualization and portability made the middle rings more trouble than they were worth.');
    s(1, 'Two Rings', { rings: true, privileged: true },
        'The list of things only ring 0 may do is short but total: talk to devices, edit page tables, mask interrupts, and decide which process gets the CPU. Attempt any of them from ring 3 and the CPU faults. This is what makes an OS an OS — without it, any program could read another\'s memory, or simply refuse to give up the CPU.');

    // ═══ ACT 2: The Wall ═══
    s(2, 'The Wall', { code: C_CODE, activeLine: 0, regs: REGS_EMPTY, caption: 'a program wants to write 13 bytes to stdout' },
        'So here is the problem. Your program wants to write to a file — bytes have to reach an actual disk. But the disk controller is hardware, and hardware is ring 0 territory. Your process cannot reach it.');
    s(2, 'The Wall', { code: C_CODE, activeLine: 0, regs: REGS_EMPTY, blocked: true },
        'Suppose the program tried anyway — issuing an I/O instruction or writing to the device\'s memory directly. The CPU checks the current privilege level, sees ring 3, and refuses. You get a general protection fault, which the kernel turns into SIGSEGV, and your process dies. Not a convention or a linker trick: the hardware itself will not execute the instruction.');
    s(2, 'The Wall', { code: C_CODE, activeLine: 0, regs: REGS_EMPTY, caption: 'the boundary has exactly one door — and the kernel controls it' },
        'The boundary is not sealed, though — it has one carefully guarded door. A program cannot jump into the kernel wherever it likes, because that would let it skip the checks. Instead it can make exactly one kind of request, at exactly one entry point the kernel chose in advance. That request is a system call.');

    // ═══ ACT 3: The Trap ═══
    s(3, 'The Trap', { code: ASM, activeLine: 0, regs: REGS_EMPTY, caption: 'the calling convention is registers, not the stack' },
        'Look at what write() compiles down to. There is no call into kernel code — there cannot be. Instead libc fills registers according to a fixed convention. rax gets the syscall number: 1 means write on x86-64 Linux.');
    s(3, 'The Trap', { code: ASM, activeLine: 3, regs: REGS_SET, caption: 'rdi, rsi, rdx carry fd, buffer, count' },
        'The arguments follow in rdi, rsi and rdx — the file descriptor, the address of the buffer, and how many bytes to write. Registers are used rather than the stack precisely because the kernel is about to switch to a different stack; registers survive the crossing, a user stack pointer would not be trustworthy.');
    s(3, 'The Trap', { code: ASM, activeLine: 4, regs: REGS_SET, token: 'user', tokenLabel: 'call', tokenColor: 'req', caption: 'one instruction: syscall' },
        'Then a single instruction: syscall. This is the doorway. It is deliberately not a jump or a call — those would let the program pick its destination. syscall does something no ring 3 instruction can normally do: it raises the CPU\'s own privilege level, but only while sending control to an address the kernel registered at boot.');

    // ═══ ACT 4: Mode Switch ═══
    s(4, 'The Mode Switch', { code: ASM, activeLine: 4, regs: REGS_SET, token: 'entry', tokenColor: 'kern', tokenLabel: 'ring0', active: ['entry'], wire: 'trap', saved: true,
        caption: 'CPL 3 → 0, and control lands where the kernel said it would' },
        'The CPU flips the current privilege level from 3 to 0 and jumps to the address stored in the LSTAR register — entry_SYSCALL_64 on Linux, written there by the kernel during boot. The program has no say in the destination. That single fact is what makes the door safe: user code chooses when to enter, never where.');
    s(4, 'The Mode Switch', { code: ASM, activeLine: 4, regs: REGS_SET, token: 'entry', tokenColor: 'kern', tokenLabel: 'save', active: ['entry', 'kstack'], saved: true,
        caption: 'user RIP and RFLAGS parked so the process can be resumed exactly' },
        'The CPU stashes the user-mode instruction pointer and flags (in rcx and r11), and the kernel switches to a per-task kernel stack — it will not run on a stack the user process controls, since a malicious program could point it anywhere. Your process is now frozen mid-instruction, with everything needed to resume it exactly where it left off.');

    // ═══ ACT 5: In the Kernel ═══
    s(5, 'Inside the Kernel', { code: ASM, activeLine: 4, regs: REGS_SET, token: 'table', tokenColor: 'kern', tokenLabel: 'rax=1', active: ['table'], tableHit: 1, wire: 'disp',
        caption: 'rax indexes the syscall table — bounds-checked first' },
        'Now the dispatch. The kernel reads rax and uses it as an index into the syscall table, an array of function pointers. It bounds-checks the number first: a bogus value gets -ENOSYS rather than a jump into nowhere. Index 1 selects sys_write.');
    s(5, 'Inside the Kernel', { code: ASM, activeLine: 4, regs: REGS_SET, token: 'handler', tokenColor: 'kern', tokenLabel: 'check', active: ['handler'], wire: 'call',
        handlerNote: 'validating arguments', caption: 'every argument is treated as hostile' },
        'Before doing anything, sys_write validates. Is fd 1 actually an open descriptor for this process? Does the buffer pointer really belong to this process\'s address space — or is it a sneaky kernel address? This is why the kernel uses copy_from_user() instead of dereferencing pointers directly. Every argument crossing the boundary is treated as hostile, because it is fully attacker-controlled.');
    s(5, 'Inside the Kernel', { code: ASM, activeLine: 4, regs: REGS_SET, token: 'hw', tokenColor: 'kern', tokenLabel: 'I/O', active: ['handler', 'hw'], wire: 'io',
        handlerNote: 'VFS → driver → device', caption: 'now in ring 0, the hardware is reachable' },
        'Checks passed, the kernel does the work your program could not: it walks the file descriptor to a file object, through the virtual filesystem layer to the right driver, and finally programs the device. If this had to wait on slow hardware, the kernel would mark the process blocked and schedule someone else — which is exactly how blocking I/O works.');

    // ═══ ACT 6: Return ═══
    s(6, 'Returning to Ring 3', { code: ASM, activeLine: 4, regs: REGS_RET, token: 'handler', tokenColor: 'ok', tokenLabel: 'ret', active: ['handler'], saved: true,
        handlerNote: 'result → rax', caption: 'the return value comes back in rax' },
        'sys_write finishes and puts its result in rax: 13, the number of bytes written. Errors come back the same way as small negative values — -EBADF, -EFAULT — which libc converts into a -1 return plus errno. There is no exception mechanism across this boundary; it is all one integer register.');
    s(6, 'Returning to Ring 3', { code: ASM, activeLine: 4, regs: REGS_RET, token: 'back', tokenColor: 'ok', tokenLabel: 'ring3', wire: 'ret', result: '13', resultNote: 'bytes written',
        caption: 'sysret drops privilege back to ring 3' },
        'Then sysret reverses everything: restore the saved instruction pointer and flags, switch back to the user stack, and drop the privilege level from 0 to 3. Control resumes at the instruction right after syscall — as if write() had simply returned.');
    s(6, 'Returning to Ring 3', { code: C_CODE, activeLine: 0, regs: REGS_RET, result: '13', resultNote: 'n = 13',
        caption: 'from C, all of that looked like an ordinary function call' },
        'Back in C, n is 13 and the program continues. From your side it looked exactly like a function call — which is the point. Everything we just walked through is hidden behind one line of source. It is also why "is this a function call or a syscall?" is one of the most useful performance questions you can ask about a hot loop.');

    // ═══ ACT 7: The Cost ═══
    s(7, 'The Cost', { cost: 1 },
        'A plain function call is a handful of instructions — push a return address, jump, come back. Around a nanosecond. It never leaves ring 3, so the CPU does no privilege work at all.');
    s(7, 'The Cost', { cost: 2 },
        'A syscall is one to two orders of magnitude more expensive. Two mode switches, a stack change, saving and restoring registers, argument validation, and a pipeline that cannot speculate straight through the boundary. Since Spectre and Meltdown it also pays for page-table isolation on every crossing, which made syscalls measurably slower on existing hardware.');
    s(7, 'The Cost', { cost: 3 },
        'And a full context switch to another process is more expensive still — microseconds. New page tables mean a TLB flush, and the incoming process arrives with cold caches. Note the distinction people often blur: a syscall switches privilege mode within your process; a context switch swaps the process itself. Every syscall is a mode switch, but only some lead to a context switch.');

    // ═══ ACT 8: Batching ═══
    s(8, 'Amortising the Crossing', { batch: 'naive' },
        'Since crossings cost, the whole game is making fewer of them. Here is the classic case: a loop of 1000 printf calls. If every one went straight to the kernel that is 1000 crossings for a trivial amount of data — the boundary, not the work, dominates.');
    s(8, 'Amortising the Crossing', { batch: 'buffered' },
        'It does not, because stdio keeps a buffer in user space and only calls write() when it fills (typically 4 KB) or hits a newline on a terminal. The same 1000 printfs collapse into a handful of syscalls. This is exactly why output can appear out of order when a program crashes — the buffered bytes never made it across.');
    s(8, 'Amortising the Crossing', { batch: 'buffered' },
        'The same instinct shows up everywhere in systems work. readv/writev move several buffers per call. epoll reports many ready sockets in one crossing instead of polling each. io_uring goes furthest — shared ring buffers let you submit and reap thousands of I/O operations with almost no syscalls at all. And the vDSO maps a little kernel code into your address space so gettimeofday() needs no crossing whatsoever.');
    s(8, 'Amortising the Crossing', {
        recap: true,
        wins: [
            { t: 'The CPU enforces the boundary', d: 'Ring 3 physically cannot touch devices or page tables. Trying faults — it is silicon, not policy.' },
            { t: 'One door, kernel-chosen', d: 'syscall raises privilege but jumps only to the address in LSTAR. You pick when to enter, never where.' },
            { t: 'Arguments are hostile', d: 'Numbers are bounds-checked, pointers validated via copy_from_user. Never trusted, because they are attacker-controlled.' },
            { t: 'Batch the crossings', d: 'Buffered stdio, writev, epoll, io_uring, vDSO — all the same trick: fewer trips through the door.' },
        ],
    }, 'That is a system call end to end: registers loaded, one syscall instruction, a hardware-enforced jump to ring 0, table dispatch, paranoid validation, the privileged work, then sysret back to exactly where you were. Once you can see this boundary, a lot of systems behaviour stops being mysterious — why strace output is so revealing, why buffered I/O exists, why io_uring was worth inventing, and why "just make fewer syscalls" is such reliable performance advice.');

    return steps;
}

// ── Router ──────────────────────────────────────────────────────────────────────
function VisualizationPanel({ step }) {
    if (!step) return null;
    if (step.rings) return <RingsScene highlight={step.highlight} privileged={step.privileged} />;
    if (step.cost)  return <CostScene count={step.cost} />;
    if (step.batch) return <BatchScene mode={step.batch} />;
    if (step.recap) return <RecapCards wins={step.wins} />;
    return <KernelStage step={step} />;
}

// ── Quiz ────────────────────────────────────────────────────────────────────────
const QUIZ = [
    {
        question: 'Why does the syscall instruction jump to an address the kernel registered, instead of one the caller supplies?',
        options: [
            'It is faster to use a fixed address',
            'Because letting user code choose the destination would let it enter the kernel past the validation and dispatch logic',
            'Registers cannot hold a jump target',
            'The kernel address is not known at compile time',
        ],
        correct: 1,
        explanation: 'The instruction raises privilege from ring 3 to ring 0, so the destination has to be trustworthy. It comes from the LSTAR register, which only ring 0 can write and the kernel sets at boot. User code controls when it enters the kernel, never where — otherwise a program could jump straight past argument checking into privileged code.',
    },
    {
        question: 'What is the difference between a mode switch and a context switch?',
        options: [
            'They are two names for the same thing',
            'A mode switch changes privilege level within the same process; a context switch swaps to a different process, with new page tables and cold caches',
            'A context switch is cheaper because it stays in the kernel',
            'A mode switch only happens on interrupts',
        ],
        correct: 1,
        explanation: 'A syscall performs a mode switch: same process, same address space, privilege level 3 → 0 and back. A context switch replaces the running process entirely — different page tables, a TLB flush, and a cold cache for the incoming process. That is why a context switch costs microseconds while a syscall costs tens to hundreds of nanoseconds.',
    },
    {
        question: 'Why must the kernel use copy_from_user() rather than dereferencing a user-supplied pointer directly?',
        options: [
            'To convert between endiannesses',
            'Because user pointers use virtual addresses and the kernel uses physical ones',
            'Because the pointer is fully attacker-controlled — it must be checked to actually belong to the calling process, not to kernel memory',
            'Because user memory is always read-only from ring 0',
        ],
        correct: 2,
        explanation: 'Running in ring 0, the kernel can dereference anything — including kernel memory. A process could pass a kernel address as its "buffer" and trick the kernel into reading or writing it. copy_from_user() validates that the range really belongs to the calling process\'s address space and handles faults safely. Every argument crossing the boundary is treated as hostile.',
    },
];

function QuizPanel({ quizState, setQuizState }) {
    const q = QUIZ[quizState.current];
    if (quizState.complete) {
        return (
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-5 text-center">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{QUIZ.length}</div>
                <div className="text-zinc-400 text-sm mb-4">
                    {quizState.score === QUIZ.length ? 'Perfect — you can read strace output now!' : 'Review the explanations to reinforce the boundary.'}
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

export default function SystemCallsPage() {
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
                            <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">System Calls and Kernel Mode</h1>
                            <p className="text-zinc-300 text-sm mt-1">
                                Protection rings, the syscall trap, table dispatch, argument validation — and why fewer crossings is always faster
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
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-3">x86-64 Linux convention</p>
                            <div className="space-y-1.5 text-xs">
                                {[
                                    { acts: [1, 2], label: 'Privilege', note: 'ring 3 → ring 0' },
                                    { acts: [3],    label: 'rax',       note: 'syscall number' },
                                    { acts: [3],    label: 'rdi rsi rdx', note: 'args 1–3' },
                                    { acts: [4],    label: 'LSTAR',     note: 'kernel entry point' },
                                    { acts: [5],    label: 'copy_from_user', note: 'validate pointers' },
                                    { acts: [6],    label: 'rax (out)',  note: 'result or -errno' },
                                    { acts: [7, 8], label: 'Cost',      note: '~50–200 ns' },
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
