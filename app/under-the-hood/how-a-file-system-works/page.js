"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info,
    Eye, Grid3x3, FileDigit, FolderTree, Route, Link2, MemoryStick, BookLock,
} from 'lucide-react';

// ── Acts ──────────────────────────────────────────────────────────────────────
const ACTS = [
    { id: 1, label: 'The Illusion', icon: Eye         },
    { id: 2, label: 'Blocks',       icon: Grid3x3     },
    { id: 3, label: 'Inodes',       icon: FileDigit   },
    { id: 4, label: 'Directories',  icon: FolderTree  },
    { id: 5, label: 'Resolution',   icon: Route       },
    { id: 6, label: 'Links',        icon: Link2       },
    { id: 7, label: 'Page Cache',   icon: MemoryStick },
    { id: 8, label: 'Journaling',   icon: BookLock    },
];

// ── Disk geometry (persistent across every act) ────────────────────────────────
const COLS = 12, BW = 48, BH = 40, BGAP = 6, BX = 58, BY0 = 278, BY1 = 324;
const NBLOCKS = 24;
const blockPos = i => [BX + (i % COLS) * (BW + BGAP), i < COLS ? BY0 : BY1];

// what lives where on our toy disk
const ROLES = {
    0: 'super', 1: 'inodes', 2: 'inodes', 3: 'journal', 4: 'journal',
    5: 'dir', 6: 'dir', 7: 'dir', 9: 'data', 10: 'data', 17: 'data',
};
const ROLE_STYLE = {
    super:   { fill: '#2e1065', stroke: '#a78bfa', text: '#ddd6fe', label: 'super' },
    inodes:  { fill: '#082f49', stroke: '#38bdf8', text: '#bae6fd', label: 'inode' },
    journal: { fill: '#3a2a0d', stroke: '#f59e0b', text: '#fde68a', label: 'jrnl' },
    dir:     { fill: '#1e1b4b', stroke: '#818cf8', text: '#c7d2fe', label: 'dir' },
    data:    { fill: '#14532d', stroke: '#22c55e', text: '#bbf7d0', label: 'data' },
    free:    { fill: '#0f172a', stroke: '#1e293b', text: '#334155', label: '' },
};

// ── The example filesystem ─────────────────────────────────────────────────────
const INODES = [
    { n: 2,  kind: 'dir',  name: '/',          blocks: [5],         links: 1, size: '4 KB' },
    { n: 12, kind: 'dir',  name: '/home',      blocks: [6],         links: 1, size: '4 KB' },
    { n: 45, kind: 'dir',  name: '/home/archi', blocks: [7],        links: 1, size: '4 KB' },
    { n: 71, kind: 'file', name: 'notes.txt',  blocks: [9, 10, 17], links: 1, size: '9 KB' },
];
const DIR_CONTENTS = {
    5: [{ name: '.', ino: 2 }, { name: '..', ino: 2 }, { name: 'home', ino: 12 }, { name: 'etc', ino: 13 }],
    6: [{ name: '.', ino: 12 }, { name: '..', ino: 2 }, { name: 'archi', ino: 45 }],
    7: [{ name: '.', ino: 45 }, { name: '..', ino: 12 }, { name: 'notes.txt', ino: 71 }, { name: 'todo.md', ino: 88 }],
};

// ── Persistent animated stage ──────────────────────────────────────────────────
function DiskStage({ step }) {
    const hot = step.hotBlocks || [];

    return (
        <svg viewBox="0 0 760 430" width="100%" className="max-h-[430px] select-none">
            <style>{`
                .fs-blk  { transition: fill .4s ease, stroke .4s ease, stroke-width .35s ease; }
                .fs-fade { transition: opacity .5s ease; }
                .fs-row  { transition: fill .35s ease, opacity .35s ease; }
                .fs-flow { stroke-dasharray: 6 5; animation: fsdash .55s linear infinite; }
                @keyframes fsdash { to { stroke-dashoffset: -22; } }
            `}</style>
            <defs>
                <marker id="fsah" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="userSpaceOnUse">
                    <path d="M0,0 L6,3 L0,6 Z" fill="context-stroke" />
                </marker>
            </defs>

            {/* ══ Upper region — switches per act ══ */}
            {step.scene === 'path' && (
                <g className="fs-fade">
                    <text x="380" y="58" textAnchor="middle" fontSize="12" fill="#64748b" fontFamily="monospace">
                        the path you type
                    </text>
                    {(() => {
                        const segs = ['/', 'home', '/', 'archi', '/', 'notes.txt'];
                        const inoFor = [2, 12, null, 45, null, 71];
                        let x = 176;
                        return segs.map((sg, i) => {
                            const w = sg.length * 11 + 16;
                            const on = step.pathStep !== undefined && step.pathStep >= i && sg !== '/';
                            const el = (
                                <g key={i} className="fs-row">
                                    <rect x={x} y={72} width={w} height={32} rx="6"
                                        fill={on ? '#1e3a5f' : '#111827'} stroke={on ? '#38bdf8' : '#1e293b'} strokeWidth={on ? 1.8 : 1.2} />
                                    <text x={x + w / 2} y={93} textAnchor="middle" fontSize="13" fontFamily="monospace"
                                        fill={on ? '#bae6fd' : '#64748b'}>{sg}</text>
                                    {on && inoFor[i] && (
                                        <text x={x + w / 2} y={120} textAnchor="middle" fontSize="10" fontFamily="monospace" fill="#38bdf8">
                                            ino {inoFor[i]}
                                        </text>
                                    )}
                                </g>
                            );
                            x += w + 4;
                            return el;
                        });
                    })()}

                    {/* resolution chain */}
                    {step.chain && (
                        <g className="fs-fade">
                            {step.chain.map((c, i) => {
                                const x = 70 + i * 132;
                                return (
                                    <g key={i}>
                                        <rect x={x} y={152} width={116} height={54} rx="8"
                                            fill={i === step.chain.length - 1 ? '#1e3a5f' : '#111827'}
                                            stroke={i === step.chain.length - 1 ? '#38bdf8' : '#334155'} strokeWidth="1.6" />
                                        <text x={x + 58} y={172} textAnchor="middle" fontSize="10" fill="#94a3b8" fontFamily="monospace">{c.t}</text>
                                        <text x={x + 58} y={192} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#e2e8f0" fontFamily="monospace">{c.v}</text>
                                        {i < step.chain.length - 1 && (
                                            <path d={`M${x + 118},179 L${x + 130},179`} stroke="#475569" strokeWidth="1.8" markerEnd="url(#fsah)" />
                                        )}
                                    </g>
                                );
                            })}
                        </g>
                    )}
                    {step.upperNote && (
                        <text x="380" y="238" textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="monospace">{step.upperNote}</text>
                    )}
                </g>
            )}

            {step.scene === 'inode' && (
                <g className="fs-fade">
                    <rect x="150" y="48" width="300" height="190" rx="10" fill="#082f49" stroke="#38bdf8" strokeWidth="1.8" />
                    <text x="300" y="70" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#bae6fd" fontFamily="monospace">inode 71</text>
                    {[
                        ['mode', '-rw-r--r--'],
                        ['uid / gid', '1000 / 1000'],
                        ['size', '9216 bytes'],
                        ['mtime', '2026-08-06 14:02'],
                        ['link count', String(step.linkCount ?? 1)],
                        ['blocks', '9, 10, 17'],
                    ].map((row, i) => (
                        <g key={row[0]} className="fs-row">
                            <text x="168" y={96 + i * 23} fontSize="11" fill="#7dd3fc" fontFamily="monospace">{row[0]}</text>
                            <text x="432" y={96 + i * 23} textAnchor="end" fontSize="11" fill="#e0f2fe" fontFamily="monospace">{row[1]}</text>
                        </g>
                    ))}
                    {step.noName && (
                        <g className="fs-fade">
                            <rect x="476" y="96" width="242" height="66" rx="9" fill="#3a0d0d" stroke="#ef4444" strokeWidth="1.8" />
                            <text x="597" y="120" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#fca5a5" fontFamily="monospace">no filename here</text>
                            <text x="597" y="140" textAnchor="middle" fontSize="10" fill="#f87171" fontFamily="monospace">the name lives in the directory</text>
                        </g>
                    )}
                    {step.indirect && (
                        <g className="fs-fade">
                            <rect x="476" y="176" width="242" height="62" rx="9" fill="#111827" stroke="#475569" strokeWidth="1.4" />
                            <text x="597" y="198" textAnchor="middle" fontSize="10" fill="#94a3b8" fontFamily="monospace">12 direct pointers, then</text>
                            <text x="597" y="216" textAnchor="middle" fontSize="10" fill="#94a3b8" fontFamily="monospace">single → double → triple</text>
                            <text x="597" y="232" textAnchor="middle" fontSize="10" fill="#94a3b8" fontFamily="monospace">indirect blocks</text>
                        </g>
                    )}
                </g>
            )}

            {step.scene === 'dir' && (
                <g className="fs-fade">
                    <text x="380" y="48" textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="monospace">
                        a directory is just a file — and this is its data block
                    </text>
                    <rect x="210" y="62" width="340" height="176" rx="10" fill="#1e1b4b" stroke="#818cf8" strokeWidth="1.8" />
                    <text x="380" y="84" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#c7d2fe" fontFamily="monospace">
                        block 7 — contents of /home/archi
                    </text>
                    <text x="240" y="106" fontSize="10" fill="#818cf8" fontFamily="monospace">name</text>
                    <text x="520" y="106" textAnchor="end" fontSize="10" fill="#818cf8" fontFamily="monospace">inode</text>
                    {DIR_CONTENTS[7].map((e, i) => {
                        const on = step.dirHit === e.name;
                        return (
                            <g key={e.name} className="fs-row">
                                {on && <rect x="228" y={116 + i * 26} width="304" height="24" rx="5" fill="#3730a3" />}
                                <text x="240" y={133 + i * 26} fontSize="12" fontFamily="monospace"
                                    fill={on ? '#eef2ff' : '#a5b4fc'}>{e.name}</text>
                                <text x="520" y={133 + i * 26} textAnchor="end" fontSize="12" fontFamily="monospace"
                                    fill={on ? '#eef2ff' : '#6366f1'}>{e.ino}</text>
                            </g>
                        );
                    })}
                    {step.upperNote && (
                        <text x="380" y="256" textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="monospace">{step.upperNote}</text>
                    )}
                </g>
            )}

            {step.scene === 'links' && (
                <g className="fs-fade">
                    {/* two directory entries */}
                    <rect x="40" y="56" width="200" height="46" rx="8" fill="#1e1b4b" stroke="#818cf8" strokeWidth="1.6" />
                    <text x="140" y="76" textAnchor="middle" fontSize="11" fill="#c7d2fe" fontFamily="monospace">notes.txt</text>
                    <text x="140" y="92" textAnchor="middle" fontSize="10" fill="#6366f1" fontFamily="monospace">→ inode 71</text>

                    {step.hard && (
                        <g className="fs-fade">
                            <rect x="40" y="120" width="200" height="46" rx="8" fill="#1e1b4b" stroke="#22c55e" strokeWidth="1.8" />
                            <text x="140" y="140" textAnchor="middle" fontSize="11" fill="#bbf7d0" fontFamily="monospace">backup.txt</text>
                            <text x="140" y="156" textAnchor="middle" fontSize="10" fill="#22c55e" fontFamily="monospace">→ inode 71 (same!)</text>
                            <path d="M244,143 L336,110" stroke="#22c55e" strokeWidth="1.8" markerEnd="url(#fsah)" className="fs-flow" />
                        </g>
                    )}
                    {step.soft && (
                        <g className="fs-fade">
                            <rect x="40" y="184" width="200" height="52" rx="8" fill="#1e1b4b" stroke="#f59e0b" strokeWidth="1.8" />
                            <text x="140" y="204" textAnchor="middle" fontSize="11" fill="#fde68a" fontFamily="monospace">shortcut → inode 92</text>
                            <text x="140" y="222" textAnchor="middle" fontSize="9" fill="#f59e0b" fontFamily="monospace">its data = &quot;/home/archi/notes.txt&quot;</text>
                            <path d="M244,206 L336,124" stroke="#f59e0b" strokeWidth="1.6" strokeDasharray="5 4" markerEnd="url(#fsah)" />
                        </g>
                    )}

                    <path d="M244,79 L336,96" stroke="#818cf8" strokeWidth="1.8" markerEnd="url(#fsah)" />

                    {/* the inode */}
                    <rect x="340" y="76" width="180" height="90" rx="9" fill="#082f49" stroke="#38bdf8" strokeWidth="1.8" />
                    <text x="430" y="100" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#bae6fd" fontFamily="monospace">inode 71</text>
                    <text x="430" y="124" textAnchor="middle" fontSize="11" fill="#7dd3fc" fontFamily="monospace">link count</text>
                    <text x="430" y="148" textAnchor="middle" fontSize="18" fontWeight="bold"
                        fill={step.linkCount === 0 ? '#ef4444' : '#e0f2fe'} fontFamily="monospace">{step.linkCount ?? 1}</text>

                    {step.freed && (
                        <g className="fs-fade">
                            <text x="620" y="112" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#ef4444" fontFamily="monospace">count 0</text>
                            <text x="620" y="132" textAnchor="middle" fontSize="10" fill="#f87171" fontFamily="monospace">inode + blocks freed</text>
                        </g>
                    )}
                    {step.upperNote && (
                        <text x="380" y="258" textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="monospace">{step.upperNote}</text>
                    )}
                </g>
            )}

            {step.scene === 'cache' && (
                <g className="fs-fade">
                    <rect x="60" y="48" width="640" height="96" rx="10" fill="#0c1a2e" stroke="#3b82f6" strokeWidth="1.6" />
                    <text x="76" y="68" fontSize="11" fontWeight="bold" fill="#93c5fd" fontFamily="monospace">page cache — in RAM</text>
                    {Array.from({ length: 8 }).map((_, i) => {
                        const state = (step.pages || [])[i] || 'empty';
                        const st = state === 'dirty' ? { f: '#7c2d12', s: '#f59e0b', t: 'dirty' }
                            : state === 'clean' ? { f: '#14532d', s: '#22c55e', t: 'clean' }
                            : { f: '#0f172a', s: '#1e293b', t: '' };
                        return (
                            <g key={i} className="fs-blk" style={{ transitionDelay: `${i * 55}ms` }}>
                                <rect x={80 + i * 78} y={82} width={68} height={46} rx="6" fill={st.f} stroke={st.s} strokeWidth="1.5" />
                                <text x={114 + i * 78} y={102} textAnchor="middle" fontSize="9" fill="#64748b" fontFamily="monospace">page {i}</text>
                                <text x={114 + i * 78} y={118} textAnchor="middle" fontSize="10" fontWeight="bold"
                                    fill={state === 'dirty' ? '#fde68a' : state === 'clean' ? '#bbf7d0' : '#334155'} fontFamily="monospace">{st.t}</text>
                            </g>
                        );
                    })}
                    <path d="M380,148 L380,268" stroke={step.flushing ? '#22c55e' : '#334155'} strokeWidth="2.4"
                        markerEnd="url(#fsah)" className={step.flushing ? 'fs-flow' : ''} />
                    <text x="396" y="200" fontSize="11" fontFamily="monospace"
                        fill={step.flushing ? '#22c55e' : '#475569'}>{step.flushing ? 'fsync() — forced to disk' : 'writeback, eventually…'}</text>
                    {step.upperNote && (
                        <text x="380" y="240" textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="monospace">{step.upperNote}</text>
                    )}
                </g>
            )}

            {step.scene === 'journal' && (
                <g className="fs-fade">
                    <text x="380" y="48" textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="monospace">
                        appending to notes.txt touches three separate blocks
                    </text>
                    {['update inode 71 size', 'mark block 21 allocated', 'write the data itself'].map((t, i) => {
                        const state = (step.ops || [])[i] || 'pending';
                        const st = state === 'done' ? { f: '#14532d', s: '#22c55e', tc: '#bbf7d0' }
                            : state === 'journaled' ? { f: '#3a2a0d', s: '#f59e0b', tc: '#fde68a' }
                            : state === 'lost' ? { f: '#3a0d0d', s: '#ef4444', tc: '#fca5a5' }
                            : { f: '#111827', s: '#334155', tc: '#64748b' };
                        return (
                            <g key={i} className="fs-blk" style={{ transitionDelay: `${i * 90}ms` }}>
                                <rect x={130} y={68 + i * 46} width={500} height={38} rx="7" fill={st.f} stroke={st.s} strokeWidth="1.6" />
                                <text x={150} y={92 + i * 46} fontSize="11" fill={st.tc} fontFamily="monospace">{i + 1}. {t}</text>
                                <text x={610} y={92 + i * 46} textAnchor="end" fontSize="10" fill={st.s} fontFamily="monospace">{state}</text>
                            </g>
                        );
                    })}
                    {step.crash && (
                        <g className="fs-fade">
                            <text x="380" y="228" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#ef4444" fontFamily="monospace">
                                ⚡ power lost here
                            </text>
                            <text x="380" y="248" textAnchor="middle" fontSize="11" fill="#f87171" fontFamily="monospace">{step.crashNote}</text>
                        </g>
                    )}
                    {!step.crash && step.upperNote && (
                        <text x="380" y="238" textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="monospace">{step.upperNote}</text>
                    )}
                </g>
            )}

            {step.scene === 'blocks' && (
                <g className="fs-fade">
                    <text x="380" y="70" textAnchor="middle" fontSize="12" fill="#94a3b8" fontFamily="monospace">{step.bigLine}</text>
                    {step.waste && (
                        <g className="fs-fade">
                            <rect x="270" y="100" width="220" height="120" rx="10" fill="#0f172a" stroke="#f59e0b" strokeWidth="1.8" />
                            <rect x="278" y="108" width="204" height="8" rx="2" fill="#22c55e" />
                            <text x="380" y="140" textAnchor="middle" fontSize="11" fill="#22c55e" fontFamily="monospace">1 byte of your data</text>
                            <text x="380" y="176" textAnchor="middle" fontSize="11" fill="#f59e0b" fontFamily="monospace">4095 bytes wasted</text>
                            <text x="380" y="196" textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="monospace">internal fragmentation</text>
                        </g>
                    )}
                    {step.upperNote && (
                        <text x="380" y="244" textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="monospace">{step.upperNote}</text>
                    )}
                </g>
            )}

            {/* ══ Persistent disk strip ══ */}
            <text x="58" y="266" fontSize="10" fill="#64748b" fontFamily="monospace">the disk — an array of numbered 4 KB blocks, nothing more</text>
            {Array.from({ length: NBLOCKS }).map((_, i) => {
                const [x, y] = blockPos(i);
                const role = step.bare ? 'free' : (ROLES[i] || 'free');
                const st = ROLE_STYLE[role];
                const isHot = hot.includes(i);
                return (
                    <g key={i}>
                        <rect x={x} y={y} width={BW} height={BH} rx="5" className="fs-blk"
                            fill={isHot ? '#3f3f46' : st.fill}
                            stroke={isHot ? '#e4e4e7' : st.stroke}
                            strokeWidth={isHot ? 2.4 : 1.3} />
                        <text x={x + BW / 2} y={y + 17} textAnchor="middle" fontSize="9"
                            fill={isHot ? '#f8fafc' : '#64748b'} fontFamily="monospace">{i}</text>
                        <text x={x + BW / 2} y={y + 31} textAnchor="middle" fontSize="9"
                            fill={isHot ? '#f8fafc' : st.text} fontFamily="monospace">{st.label}</text>
                    </g>
                );
            })}

            {/* legend */}
            {!step.bare && (
                <g className="fs-fade">
                    {[['super', 'superblock'], ['inodes', 'inode table'], ['journal', 'journal'], ['dir', 'directory data'], ['data', 'file data']].map((L, i) => {
                        const st = ROLE_STYLE[L[0]];
                        const x = 62 + i * 132;
                        return (
                            <g key={L[0]}>
                                <rect x={x} y={378} width={11} height={11} rx="2" fill={st.fill} stroke={st.stroke} strokeWidth="1.2" />
                                <text x={x + 17} y={388} fontSize="9" fill="#64748b" fontFamily="monospace">{L[1]}</text>
                            </g>
                        );
                    })}
                </g>
            )}

            {step.caption && (
                <text x="380" y="414" textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="monospace">{step.caption}</text>
            )}
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

    // ═══ ACT 1: The Illusion ═══
    s(1, 'The Illusion', { scene: 'path', bare: true, caption: 'every block identical, none of them labelled "notes.txt"' },
        'You type /home/archi/notes.txt and a file appears. It feels like the path is an address — like the disk has folders in it. It does not. A disk is one flat array of numbered, fixed-size blocks, and absolutely nothing down there stores that string as a unit. The hierarchy is a fiction the filesystem maintains on top of a flat array.');
    s(1, 'The Illusion', { scene: 'path', upperNote: 'the filesystem is the code that maintains this illusion' },
        'A filesystem is the layer that builds the illusion: which blocks are free, which belong to which file, and what names map to what. Once you can see those three jobs separately, everything from hard links to fsync stops being magic. Here is our toy disk with the structures laid out — let us build up to that path.');

    // ═══ ACT 2: Blocks ═══
    s(2, 'Blocks', { scene: 'blocks', bigLine: 'the block is the unit of allocation — typically 4 KB', upperNote: 'the disk exposes sectors; the filesystem groups them into blocks' },
        'Storage hands out fixed-size chunks. The filesystem picks a block size — 4 KB is near-universal — and from then on that is the smallest thing it can allocate. Not one byte, not one sector: one block. Block 0 usually holds the superblock, which describes the whole filesystem: block size, how many inodes, where everything begins.');
    s(2, 'Blocks', { scene: 'blocks', waste: true, bigLine: 'a 1-byte file still costs a whole block', hotBlocks: [9] },
        'Which means a file containing a single byte still consumes an entire 4 KB block. Those wasted 4095 bytes are internal fragmentation, and it is why a directory of thousands of tiny files takes far more space than "du" of their contents suggests, and why `ls -l` size and disk usage disagree.');
    s(2, 'Blocks', { scene: 'blocks', bigLine: 'a bigger file spans several blocks — not necessarily adjacent ones', hotBlocks: [9, 10, 17], upperNote: 'notes.txt lives in blocks 9, 10 and 17' },
        'A 9 KB file needs three blocks. Notice they are not contiguous — 9, 10, then 17. The filesystem grabs whatever is free. When files end up scattered this way the disk is fragmented, which barely matters on an SSD but mattered enormously on spinning platters, where the head physically had to seek.');

    // ═══ ACT 3: The Inode ═══
    s(3, 'The Inode', { scene: 'inode', hotBlocks: [1, 2], caption: 'inodes live in their own reserved region, allocated at format time' },
        'So how does the filesystem remember that blocks 9, 10 and 17 form one file? With an inode — a small fixed-size record holding everything about the file except its contents. Permissions, owner, size, timestamps, and the list of blocks. Inodes are numbered, and inode number is a file\'s true identity.');
    s(3, 'The Inode', { scene: 'inode', noName: true, hotBlocks: [1, 2], caption: 'the inode knows everything about the file except what it is called' },
        'And here is the detail that explains most of the surprising behaviour ahead: the filename is nowhere in the inode. The inode knows the file is 9 KB, owned by uid 1000, stored in blocks 9, 10 and 17 — but it has no idea it is called notes.txt. That fact belongs to whoever points at it.');
    s(3, 'The Inode', { scene: 'inode', indirect: true, hotBlocks: [9, 10, 17], caption: 'direct pointers cover small files; indirect blocks extend the rest' },
        'An inode is fixed-size, so it cannot hold an unbounded block list. Classic Unix designs keep about 12 direct pointers, then a single indirect block (a block full of pointers), then double and triple indirect. Small files need no indirection at all; huge files pay one or two extra lookups. Modern ext4 uses extents — start plus length — which is far more compact for large contiguous files.');

    // ═══ ACT 4: Directories ═══
    s(4, 'Directories', { scene: 'dir', hotBlocks: [7], caption: 'block 7 is an ordinary data block — it just happens to hold names' },
        'If names are not in inodes, where are they? In directories. And a directory is not a special container — it is just a file, with its own inode, whose data blocks hold a simple table: name → inode number. That is the entire mechanism. Here is block 7, the data of /home/archi.');
    s(4, 'Directories', { scene: 'dir', dirHit: 'notes.txt', hotBlocks: [7], upperNote: 'renaming a file rewrites this row — the file itself never moves' },
        'The entry "notes.txt → 71" is the only thing in the system connecting that name to that file. Rename the file and you edit this one row; not a single data block moves, which is why renaming a 4 GB file is instant. Move it to another directory on the same filesystem and you delete a row here and add one there — still no data copied. Across filesystems, though, there is no shared inode space, so it becomes a real copy plus delete.');

    // ═══ ACT 5: Path Resolution ═══
    s(5, 'Walking the Path', { scene: 'path', pathStep: 0, chain: [{ t: 'start at', v: 'inode 2' }], hotBlocks: [1, 2],
        caption: 'the root inode number is fixed and known in advance' },
        'Now we can resolve /home/archi/notes.txt properly. The leading slash means start at the root directory, whose inode number is fixed by convention — inode 2 on ext filesystems. The kernel knows where the inode table is from the superblock, so this first step needs no lookup.');
    s(5, 'Walking the Path', { scene: 'path', pathStep: 1, chain: [{ t: 'inode 2', v: 'block 5' }, { t: 'find "home"', v: 'inode 12' }], hotBlocks: [5],
        caption: 'read the root directory\'s data block, scan for "home"' },
        'Read inode 2 to learn its data lives in block 5. Read block 5 and scan its entries for "home" — found, inode 12. Notice the shape: read an inode, read its data block, search for the next component, get an inode number. That loop repeats once per path component.');
    s(5, 'Walking the Path', { scene: 'path', pathStep: 3, chain: [{ t: 'inode 12', v: 'block 6' }, { t: 'find "archi"', v: 'inode 45' }], hotBlocks: [6],
        caption: 'same two reads again, one level deeper' },
        'Again: inode 12 points to block 6, and block 6 contains "archi → 45". Every single component costs at least an inode read plus a directory read. This is exactly why the kernel keeps a dentry cache of recently resolved names — without it, a deep path on a busy server would be brutal, and why permission checks happen at every level, not just the last.');
    s(5, 'Walking the Path', { scene: 'path', pathStep: 5, chain: [{ t: 'inode 45', v: 'block 7' }, { t: 'find "notes.txt"', v: 'inode 71' }], hotBlocks: [7, 9, 10, 17],
        caption: 'inode 71 at last — and its blocks are 9, 10, 17' },
        'One more turn of the loop lands on inode 71, and only now do we know where the bytes actually are: blocks 9, 10 and 17. The path was never an address — it was a series of lookups through directory files, each one just a name-to-number table.');

    // ═══ ACT 6: Links ═══
    s(6, 'Hard Links and Symlinks', { scene: 'links', linkCount: 1, hotBlocks: [7], upperNote: 'one name, one inode, link count 1' },
        'Because names live in directories and identity lives in inodes, nothing stops two names pointing at the same inode. Right now notes.txt is the only entry pointing at inode 71, so its link count is 1.');
    s(6, 'Hard Links and Symlinks', { scene: 'links', hard: true, linkCount: 2, hotBlocks: [7], upperNote: 'ln notes.txt backup.txt — a second name, same file' },
        'Run `ln notes.txt backup.txt` and you get a hard link: a second directory entry pointing at inode 71, and the link count becomes 2. There is no original and no copy — both names are equally real, and the data exists exactly once. Delete either name and the other still works, which is precisely why the syscall is called unlink() rather than delete(): it removes a name and decrements the count.');
    s(6, 'Hard Links and Symlinks', { scene: 'links', hard: true, soft: true, linkCount: 2, hotBlocks: [7],
        upperNote: 'a symlink is a real file whose contents are a path string' },
        'A symlink is a different animal: its own inode, its own tiny data holding the text "/home/archi/notes.txt". Resolving it means restarting path resolution on that string. That is why a symlink can dangle when its target disappears, and why it can point across filesystems — while a hard link cannot, since inode numbers are only meaningful within one filesystem.');
    s(6, 'Hard Links and Symlinks', { scene: 'links', hard: false, soft: false, linkCount: 0, freed: true, hotBlocks: [9, 10, 17],
        upperNote: 'blocks return to the free pool only when the count hits zero' },
        'Remove every name and the count reaches 0 — now the inode and its blocks go back to the free pool. One more wrinkle: the kernel also refuses to free anything while a process still has the file open. That is why deleting a huge log file does not reclaim space until you restart the process holding it, and why a program can unlink its own temp file and keep using the handle safely.');

    // ═══ ACT 7: The Page Cache ═══
    s(7, 'The Page Cache', { scene: 'cache', pages: ['clean', 'clean', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'], hotBlocks: [9, 10],
        upperNote: 'a read populates the cache; the next read never touches the disk' },
        'One more layer sits between you and the platter. Reads do not go straight to disk — the kernel keeps file pages in RAM in the page cache. Read blocks 9 and 10 once and they stay cached, so the next read is a memcpy rather than an I/O. This is why the second run of a command is so much faster, and why "free" memory on a healthy Linux box looks alarmingly low: unused RAM is wasted RAM.');
    s(7, 'The Page Cache', { scene: 'cache', pages: ['dirty', 'clean', 'dirty', 'empty', 'empty', 'empty', 'empty', 'empty'], hotBlocks: [],
        upperNote: 'write() returns as soon as the page is marked dirty' },
        'Writes work the same way in reverse. write() copies your bytes into a cache page, marks it dirty, and returns successfully — before anything reaches the disk. Your program believes the write happened. Physically it has not. The kernel will flush dirty pages in the background, on its own schedule.');
    s(7, 'The Page Cache', { scene: 'cache', pages: ['clean', 'clean', 'clean', 'empty', 'empty', 'empty', 'empty', 'empty'], flushing: true, hotBlocks: [9, 10, 17],
        upperNote: 'fsync() blocks until the device confirms the write' },
        'To actually be sure, you call fsync() — it blocks until the device says the data is durable. This gap is the single most misunderstood thing about file I/O: a successful write() is not a promise of durability. It is why databases fsync on commit, why editors fsync before reporting "saved", and why pulling the plug can lose data your program was told it had written.');

    // ═══ ACT 8: Journaling ═══
    s(8, 'Journaling', { scene: 'journal', ops: ['pending', 'pending', 'pending'], hotBlocks: [1, 9, 10, 17],
        upperNote: 'one logical operation, three physical writes' },
        'Last problem. Appending to a file is one operation to you, but three separate block writes underneath: grow the inode\'s size, mark a new block as allocated, and write the data. The disk has no idea these belong together.');
    s(8, 'Journaling', { scene: 'journal', ops: ['done', 'lost', 'lost'], crash: true, crashNote: 'inode says 13 KB, but the block was never allocated → corruption', hotBlocks: [1] },
        'Lose power between them and the filesystem is left inconsistent — an inode claiming bytes that were never allocated, or a block marked used that no file references. The old fix was fsck: scan the entire filesystem at boot to find and repair contradictions, which on a large disk took a very long time.');
    s(8, 'Journaling', { scene: 'journal', ops: ['journaled', 'journaled', 'journaled'], hotBlocks: [3, 4],
        upperNote: 'write the intent to the journal first, then commit it' },
        'Journaling fixes this by writing the intent down first. All three changes go into the journal — a small reserved region — followed by a commit record. Only then are the real blocks updated. The journal is written sequentially, so it is cheap.');
    s(8, 'Journaling', { scene: 'journal', ops: ['done', 'done', 'done'], hotBlocks: [1, 3, 4, 9, 10, 17],
        upperNote: 'on reboot: replay committed transactions, discard incomplete ones' },
        'Now a crash is survivable. On mount the filesystem reads the journal: any transaction with a commit record gets replayed, anything incomplete is discarded. Either the whole operation happened or none of it did — recovery takes seconds instead of a full scan. Worth knowing: ext4 journals metadata only by default (data=ordered), so structure survives a crash but recent file contents may not — full data journaling is available, and costs you writing everything twice.');
    s(8, 'Journaling', {
        recap: true,
        wins: [
            { t: 'Names and files are separate', d: 'Inodes hold everything except the name; directories are files mapping name → inode. That split explains links, instant renames, and unlink().' },
            { t: 'Path resolution is a loop', d: 'Read inode, read directory block, find next component, repeat. Every component costs I/O — hence the dentry cache.' },
            { t: 'write() is not durable', d: 'It marks a page dirty in RAM and returns. Only fsync() waits for the device. This is the gap that loses data on power failure.' },
            { t: 'Journals make crashes atomic', d: 'Intent is logged before the real blocks change, so recovery replays or discards whole transactions instead of scanning everything.' },
        ],
    }, 'That is a filesystem: a flat array of blocks, plus inodes that own blocks, plus directories that map names to inodes, plus a cache that makes it fast and a journal that makes it survivable. Nearly every puzzling behaviour follows from that structure — why renames are instant, why deleting a file does not free space while it is open, why `df` and `du` disagree, why databases obsess over fsync, and why filesystems stopped needing a fsck on every boot.');

    return steps;
}

// ── Router ──────────────────────────────────────────────────────────────────────
function VisualizationPanel({ step }) {
    if (!step) return null;
    if (step.recap) return <RecapCards wins={step.wins} />;
    return <DiskStage step={step} />;
}

// ── Quiz ────────────────────────────────────────────────────────────────────────
const QUIZ = [
    {
        question: 'Where is a file\'s name actually stored?',
        options: [
            'In the inode, alongside size and permissions',
            'In the superblock',
            'In the directory that contains it, as a name → inode number entry',
            'In the first bytes of the file\'s data block',
        ],
        correct: 2,
        explanation: 'The inode holds everything about a file except its name — permissions, owner, size, timestamps, block pointers. The name lives in a directory, which is itself just a file whose data is a table of name → inode pairs. This separation is why two names can point at one file, why renaming moves no data, and why the syscall to delete a name is called unlink().',
    },
    {
        question: 'Why can data be lost after write() has already returned successfully?',
        options: [
            'write() only validates arguments and queues nothing',
            'The bytes are in a dirty page in RAM; the kernel flushes them later, so a crash before writeback loses them unless you fsync()',
            'The filesystem journal discards recent writes on reboot',
            'Because the block was never allocated',
        ],
        correct: 1,
        explanation: 'write() copies your bytes into the page cache, marks the page dirty, and returns — the disk has not been touched yet. Writeback happens in the background on the kernel\'s schedule. Only fsync() blocks until the device confirms durability, which is why databases fsync on commit and why power loss can lose data a program was told it had written.',
    },
    {
        question: 'What does an inode\'s link count track, and when are its blocks freed?',
        options: [
            'The number of open file descriptors; freed when all are closed',
            'The number of blocks in the file; freed when it reaches zero',
            'The number of hard links (directory entries) pointing at it — freed only when the count hits zero AND no process still has it open',
            'The number of symlinks pointing at it',
        ],
        correct: 2,
        explanation: 'The link count counts directory entries referring to that inode. unlink() removes one name and decrements it; the inode and its blocks return to the free pool only at zero — and even then the kernel waits until no process holds the file open. That is why deleting a large log file does not reclaim space until the process writing it restarts.',
    },
];

function QuizPanel({ quizState, setQuizState }) {
    const q = QUIZ[quizState.current];
    if (quizState.complete) {
        return (
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-5 text-center">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{QUIZ.length}</div>
                <div className="text-zinc-400 text-sm mb-4">
                    {quizState.score === QUIZ.length ? 'Perfect — you think in inodes now!' : 'Review the explanations to reinforce the structures.'}
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

export default function FileSystemPage() {
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
                            <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">How a File System Works</h1>
                            <p className="text-zinc-300 text-sm mt-1">
                                Blocks, inodes, directory entries, path resolution, links, the page cache — and why fsync exists
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
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-3">On-disk structures</p>
                            <div className="space-y-1.5 text-xs">
                                {[
                                    { acts: [1, 2], label: 'Block',      note: '4 KB · unit of alloc' },
                                    { acts: [2],    label: 'Superblock', note: 'block 0 · layout' },
                                    { acts: [3],    label: 'Inode',      note: 'metadata + pointers' },
                                    { acts: [4, 5], label: 'Dir entry',  note: 'name → inode' },
                                    { acts: [6],    label: 'Link count', note: 'names pointing here' },
                                    { acts: [7],    label: 'Page cache', note: 'RAM · dirty pages' },
                                    { acts: [8],    label: 'Journal',    note: 'intent before data' },
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
