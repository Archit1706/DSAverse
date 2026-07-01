"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info,
    Layers, Boxes, Binary, Zap, Table2, HardDrive, Shield, Gauge,
} from 'lucide-react';

// ── Acts ──────────────────────────────────────────────────────────────────────
const ACTS = [
    { id: 1, label: 'The Illusion', icon: Layers    },
    { id: 2, label: 'Pages',        icon: Boxes     },
    { id: 3, label: 'The Address',  icon: Binary    },
    { id: 4, label: 'TLB Hit',      icon: Zap       },
    { id: 5, label: 'Page Walk',    icon: Table2    },
    { id: 6, label: 'Page Fault',   icon: HardDrive },
    { id: 7, label: 'Isolation',    icon: Shield    },
    { id: 8, label: 'Why It Wins',  icon: Gauge     },
];

// ── Geometry ────────────────────────────────────────────────────────────────────
const pageY  = i => 55 + i * 38;                 // top of page cell i (VA space)
const frameY = i => 34 + i * 40;                 // top of frame cell i (physical)
const pageCenter  = i => [78, pageY(i) + 15];
const frameCenter = i => [664, frameY(i) + 16];

const ANCHOR = {
    addr: [120, 330],
    tlb:  [330, 78],
    pt:   [340, 236],
    disk: [330, 356],
    f0: frameCenter(0), f1: frameCenter(1), f2: frameCenter(2), f3: frameCenter(3),
    f4: frameCenter(4), f5: frameCenter(5), f6: frameCenter(6), f7: frameCenter(7),
};

// physical frames (fixed) — what currently lives in RAM
const FRAMES = [
    { i: 0, label: '—',          who: 'free'  },
    { i: 1, label: 'P1 · page3', who: 'p1'    },
    { i: 2, label: 'P1 · page4', who: 'p1'    },
    { i: 3, label: 'P2 · page1', who: 'p2'    },
    { i: 4, label: 'P1 · page0', who: 'p1'    },
    { i: 5, label: '—',          who: 'free'  },
    { i: 6, label: 'OS kernel',  who: 'os'    },
    { i: 7, label: 'P1 · page1', who: 'p1'    },
];
// process-1 page table: vpn → { pfn, present }
const PAGE_TABLE = [
    { vpn: 0, pfn: 4,  present: true  },
    { vpn: 1, pfn: 7,  present: true  },
    { vpn: 2, pfn: null, present: false }, // on disk
    { vpn: 3, pfn: 1,  present: true  },
    { vpn: 4, pfn: 2,  present: true  },
];
const TLB_BASE = [{ vpn: 1, pfn: 7 }, { vpn: 3, pfn: 1 }];
// mapping arrows for the "illusion" view (present pages → their frames)
const MAP_ARROWS = [
    { page: 0, frame: 4 }, { page: 1, frame: 7 }, { page: 3, frame: 1 }, { page: 4, frame: 2 },
];

// ── Persistent animated stage ───────────────────────────────────────────────────
function MemoryStage({ step }) {
    const has = id => step.show.includes(id);
    const [tx, ty] = step.token ? ANCHOR[step.token] : [ -50, -50 ];
    const tlb = step.tlb || TLB_BASE;

    const wireOn = id => step.activeWire === id;
    const wireStroke = id => wireOn(id) ? '#e4e4e7' : '#334155';
    const wireCls = id => wireOn(id) ? 'vm-flow' : '';

    const boxGlow = (on) => on ? { filter: 'drop-shadow(0 0 6px rgba(228,228,231,0.35))' } : {};

    return (
        <svg viewBox="0 0 740 400" width="100%" className="max-h-[420px] select-none">
            <style>{`
                .vm-flow { stroke-dasharray: 6 5; animation: vmdash 0.6s linear infinite; }
                @keyframes vmdash { to { stroke-dashoffset: -22; } }
                .vm-fade { transition: opacity .5s ease, transform .5s ease; }
                .vm-box  { transition: opacity .5s ease, stroke .4s ease, fill .4s ease; }
                .vm-cell { transition: fill .45s ease, stroke .45s ease, opacity .45s ease; }
                .vm-token g { transition: opacity .35s ease; }
            `}</style>
            <defs>
                <marker id="vmah" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="userSpaceOnUse">
                    <path d="M0,0 L6,3 L0,6 Z" fill="context-stroke" />
                </marker>
            </defs>

            {/* ── Column labels ── */}
            <text x="78"  y="30" textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="monospace">
                {has('addr') && !has('pages') ? 'virtual address' : 'virtual pages'}
            </text>
            <text x="664" y="20" textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="monospace">physical RAM</text>

            {/* ── Physical frames (always present) ── */}
            {FRAMES.map(f => {
                const active = step.activeFrame === f.i;
                const fault  = step.faultFrame === f.i;
                const fill = active ? '#14532d' : fault ? '#3b0764' : f.who === 'free' ? '#0f172a' : '#1e293b';
                const stroke = active ? '#22c55e' : fault ? '#a855f7' : f.who === 'os' ? '#475569' : '#334155';
                return (
                    <g key={f.i} className="vm-cell">
                        <rect x="610" y={frameY(f.i)} width="108" height="32" rx="5" fill={fill} stroke={stroke} strokeWidth={active || fault ? 2 : 1.3} style={boxGlow(active || fault)} />
                        <text x="618" y={frameY(f.i) + 20} fontSize="10" fill="#64748b" fontFamily="monospace">f{f.i}</text>
                        <text x="700" y={frameY(f.i) + 20} textAnchor="end" fontSize="10"
                            fill={active ? '#bbf7d0' : fault ? '#e9d5ff' : f.who === 'free' ? '#475569' : '#94a3b8'} fontFamily="monospace">{f.label}</text>
                    </g>
                );
            })}

            {/* ── Virtual pages column (illusion / isolation views) ── */}
            <g className="vm-fade" style={{ opacity: has('pages') ? 1 : 0 }}>
                {[0, 1, 2, 3, 4].map(i => {
                    const active = step.activePage === i;
                    const onDisk = i === 2;
                    return (
                        <g key={i} className="vm-cell">
                            <rect x="28" y={pageY(i)} width="100" height="30" rx="5"
                                fill={active ? '#14532d' : '#1e293b'} stroke={active ? '#22c55e' : onDisk ? '#a855f7' : '#334155'} strokeWidth={active ? 2 : 1.3} style={boxGlow(active)} />
                            <text x="78" y={pageY(i) + 20} textAnchor="middle" fontSize="10" fill={active ? '#bbf7d0' : '#94a3b8'} fontFamily="monospace">page {i}</text>
                        </g>
                    );
                })}
            </g>

            {/* ── mapping arrows (illusion + isolation) ── */}
            <g className="vm-fade" style={{ opacity: step.mapping ? 1 : 0 }}>
                {MAP_ARROWS.map((m, k) => {
                    const [px, py] = pageCenter(m.page);
                    const [fx, fy] = frameCenter(m.frame);
                    const mx = (px + fx) / 2;
                    return <path key={k} d={`M ${px + 52} ${py} C ${mx} ${py}, ${mx} ${fy}, ${fx - 56} ${fy}`}
                        fill="none" stroke="#3b82f6" strokeWidth="1.4" opacity="0.55" markerEnd="url(#vmah)" />;
                })}
                {step.proc2 && (() => {
                    const [px, py] = pageCenter(1);
                    const [fx, fy] = frameCenter(3);
                    const mx = (px + fx) / 2;
                    return <path d={`M ${px + 52} ${py + 6} C ${mx} ${py + 30}, ${mx} ${fy}, ${fx - 56} ${fy}`}
                        fill="none" stroke="#f97316" strokeWidth="1.6" opacity="0.8" markerEnd="url(#vmah)" strokeDasharray="5 3" />;
                })()}
            </g>

            {/* ── Virtual address bar (pipeline views) ── */}
            <g className="vm-fade" style={{ opacity: has('addr') ? 1 : 0 }}>
                <rect x="26" y="308" width="188" height="44" rx="6" fill="#0f172a" stroke="#334155" strokeWidth="1.3" />
                <rect x="30" y="312" width="96" height="36" rx="4"
                    fill={step.splitVPN ? '#1e3a5f' : '#1e293b'} stroke={step.splitVPN ? '#3b82f6' : '#334155'} strokeWidth="1.4" className="vm-box" />
                <text x="78" y="328" textAnchor="middle" fontSize="9" fill="#60a5fa" fontFamily="monospace">VPN</text>
                <text x="78" y="342" textAnchor="middle" fontSize="12" fill="#93c5fd" fontFamily="monospace" fontWeight="bold">{step.addr ? step.addr.vpn : '—'}</text>
                <rect x="128" y="312" width="82" height="36" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="1.4" />
                <text x="169" y="328" textAnchor="middle" fontSize="9" fill="#64748b" fontFamily="monospace">offset</text>
                <text x="169" y="342" textAnchor="middle" fontSize="12" fill="#cbd5e1" fontFamily="monospace">{step.addr ? step.addr.offset : ''}</text>
            </g>

            {/* ── TLB ── */}
            <g className="vm-fade" style={{ opacity: has('tlb') ? 1 : 0 }}>
                <rect x="262" y="40" width="150" height="80" rx="8"
                    fill="#0f172a" stroke={step.active === 'tlb' ? '#facc15' : '#334155'} strokeWidth={step.active === 'tlb' ? 2 : 1.3} className="vm-box" style={boxGlow(step.active === 'tlb')} />
                <text x="337" y="34" textAnchor="middle" fontSize="11" fill="#facc15" fontFamily="monospace">TLB · fast cache</text>
                {tlb.map((e, i) => {
                    const hit = step.tlbHit === e.vpn;
                    return (
                        <g key={i} className="vm-cell">
                            <rect x="270" y={48 + i * 30} width="134" height="26" rx="4"
                                fill={hit ? '#14532d' : '#1e293b'} stroke={hit ? '#22c55e' : '#334155'} strokeWidth={hit ? 1.8 : 1} />
                            <text x="337" y={65 + i * 30} textAnchor="middle" fontSize="11" fill={hit ? '#bbf7d0' : '#94a3b8'} fontFamily="monospace">VPN {e.vpn} → frame {e.pfn}</text>
                        </g>
                    );
                })}
                {step.tlbMiss && <text x="337" y={48 + tlb.length * 30 + 12} textAnchor="middle" fontSize="10" fill="#f87171" fontFamily="monospace">miss — VPN {step.addr?.vpn} not cached</text>}
            </g>

            {/* ── Page table ── */}
            <g className="vm-fade" style={{ opacity: has('pt') ? 1 : 0 }}>
                <rect x="262" y="150" width="176" height="164" rx="8"
                    fill="#0f172a" stroke={step.active === 'pt' ? '#22d3ee' : '#334155'} strokeWidth={step.active === 'pt' ? 2 : 1.3} className="vm-box" style={boxGlow(step.active === 'pt')} />
                <text x="350" y="166" textAnchor="middle" fontSize="11" fill="#22d3ee" fontFamily="monospace">page table (in RAM)</text>
                {PAGE_TABLE.map((r, i) => {
                    const active = step.activePT === r.vpn;
                    return (
                        <g key={i} className="vm-cell">
                            <rect x="270" y={174 + i * 27} width="160" height="24" rx="4"
                                fill={active ? (r.present ? '#14532d' : '#3b0764') : '#1e293b'}
                                stroke={active ? (r.present ? '#22c55e' : '#a855f7') : '#334155'} strokeWidth={active ? 1.8 : 1} />
                            <text x="278" y={190 + i * 27} fontSize="10" fill="#94a3b8" fontFamily="monospace">VPN {r.vpn}</text>
                            <text x="422" y={190 + i * 27} textAnchor="end" fontSize="10"
                                fill={r.present ? (active ? '#bbf7d0' : '#94a3b8') : '#c4b5fd'} fontFamily="monospace">
                                {r.present ? `frame ${r.pfn}` : 'on disk ✕'}
                            </text>
                        </g>
                    );
                })}
            </g>

            {/* ── Disk ── */}
            <g className="vm-fade" style={{ opacity: has('disk') ? 1 : 0 }}>
                <rect x="262" y="332" width="136" height="46" rx="8"
                    fill="#0f172a" stroke={step.active === 'disk' ? '#a855f7' : '#334155'} strokeWidth={step.active === 'disk' ? 2 : 1.3} className="vm-box" style={boxGlow(step.active === 'disk')} />
                <text x="330" y="352" textAnchor="middle" fontSize="11" fill="#c4b5fd" fontFamily="monospace">disk (swap)</text>
                <text x="330" y="368" textAnchor="middle" fontSize="9" fill="#64748b" fontFamily="monospace">page 2 lives here</text>
            </g>

            {/* ── Pipeline wires ── */}
            <g className="vm-fade" style={{ opacity: step.pipeline ? 1 : 0 }}>
                {/* addr → TLB */}
                <path d="M 214 322 C 245 322, 240 90, 260 82" fill="none" stroke={wireStroke('a_tlb')} strokeWidth="2" markerEnd="url(#vmah)" className={wireCls('a_tlb')} />
                {/* addr → page table */}
                <path d="M 214 335 C 240 320, 245 235, 258 232" fill="none" stroke={wireStroke('a_pt')} strokeWidth="2" markerEnd="url(#vmah)" className={wireCls('a_pt')} />
                {/* TLB → RAM */}
                <path d="M 414 80 C 500 80, 520 120, 606 140" fill="none" stroke={wireStroke('tlb_ram')} strokeWidth="2" markerEnd="url(#vmah)" className={wireCls('tlb_ram')} />
                {/* page table → RAM */}
                <path d="M 440 232 C 520 232, 520 180, 606 175" fill="none" stroke={wireStroke('pt_ram')} strokeWidth="2" markerEnd="url(#vmah)" className={wireCls('pt_ram')} />
                {/* page table → disk */}
                <path d="M 340 314 L 335 330" fill="none" stroke={wireStroke('pt_disk')} strokeWidth="2" markerEnd="url(#vmah)" className={wireCls('pt_disk')} />
                {/* disk → RAM */}
                <path d="M 398 352 C 520 352, 540 260, 606 250" fill="none" stroke={wireStroke('disk_ram')} strokeWidth="2" markerEnd="url(#vmah)" className={wireCls('disk_ram')} />
                {/* TLB fill (page table → TLB) */}
                <path d="M 350 150 L 345 122" fill="none" stroke={wireStroke('pt_tlb')} strokeWidth="2" markerEnd="url(#vmah)" className={wireCls('pt_tlb')} strokeDasharray="3 3" />
            </g>

            {/* ── Moving token ── */}
            <g className="vm-token" style={{ transform: `translate(${tx}px, ${ty}px)`, transition: 'transform 0.75s cubic-bezier(0.45,0,0.15,1)' }}>
                <g style={{ opacity: step.token ? 1 : 0 }}>
                    <circle r="17" fill={step.tokenColor === 'fault' ? '#7e22ce' : step.tokenColor === 'ok' ? '#15803d' : '#0369a1'} stroke="#e2e8f0" strokeWidth="1.6" />
                    <text y="4" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#f8fafc" fontFamily="monospace">{step.tokenLabel || ''}</text>
                </g>
            </g>
        </svg>
    );
}

// ── Step generation ───────────────────────────────────────────────────────────
function generateSteps() {
    const steps = [];
    const s = (act, actName, data, explanation) => steps.push({ act, actName, show: [], ...data, explanation });

    // ═══ ACT 1: The Illusion ═══
    s(1, 'The Illusion', {
        show: ['pages'],
    }, 'Every running process believes it owns one huge, private, contiguous block of memory — starting at address 0 and running up to (on 64-bit) an absurdly large ceiling. On the left is that view: a tidy column of virtual pages. It is a comforting lie the operating system and CPU tell every program.');
    s(1, 'The Illusion', {
        show: ['pages'], mapping: true,
    }, 'Physical RAM (right) tells the truth: it is a limited, shared, fragmented resource. The magic of virtual memory is the mapping between the two — watch the arrows. A program\'s neat, ordered pages are scattered across whatever physical frames happen to be free. The program never sees this; it only ever touches virtual addresses.');

    // ═══ ACT 2: Pages & Frames ═══
    s(2, 'Pages & Frames', {
        show: ['pages'], mapping: true,
    }, 'The mapping works at a fixed granularity. The virtual space is chopped into equal-sized pages (typically 4 KB), and physical RAM into equal-sized frames of the same size. Any page can live in any frame — the sizes match, so it is a clean slot-into-slot fit. Fixed sizes are what make the bookkeeping fast and the arithmetic simple.');
    s(2, 'Pages & Frames', {
        show: ['pages'], mapping: true, activePage: 1, activeFrame: 7,
    }, 'Here virtual page 1 currently lives in physical frame 7. Notice frame 6 holds the OS kernel and some frames are free. The mapping is not fixed forever — the OS can move a page to a different frame, or evict it entirely, and just update the record. Which raises the real question: where is that record kept, and how is it looked up on every single memory access?');

    // ═══ ACT 3: The Address ═══
    s(3, 'The Address', {
        show: ['addr', 'tlb', 'pt'], addr: { vpn: '1', offset: '0x02C' },
    }, 'It starts with the address itself. When the CPU reads or writes memory, it produces a virtual address. Hardware splits that address into two parts with a single bit-mask — no math needed. The upper bits are the Virtual Page Number (VPN): which page. The lower bits are the offset: how far into that page.');
    s(3, 'The Address', {
        show: ['addr', 'tlb', 'pt'], addr: { vpn: '1', offset: '0x02C' }, splitVPN: true,
    }, 'Only the VPN needs translating — the offset is copied straight through, because a page and its frame are the same size, so position-within-page equals position-within-frame. So the entire job is: turn this VPN into a physical frame number. Two structures race to answer that: the TLB (a tiny, blazing-fast cache) and the page table (the complete map, but slower, in RAM).');

    // ═══ ACT 4: TLB Hit ═══
    s(4, 'TLB Hit', {
        show: ['addr', 'tlb', 'pt'], pipeline: true, addr: { vpn: '1', offset: '0x02C' },
        token: 'addr', tokenLabel: 'VPN1', tokenColor: 'req',
    }, 'A memory access begins. The address token carries VPN 1 out of the CPU. First stop, always, is the TLB — the Translation Lookaside Buffer. It is a small hardware cache holding the most recently used VPN→frame translations, and it answers in about one clock cycle. Follow the token to the TLB.');
    s(4, 'TLB Hit', {
        show: ['addr', 'tlb', 'pt'], pipeline: true, addr: { vpn: '1', offset: '0x02C' },
        token: 'tlb', tokenLabel: 'VPN1', tokenColor: 'req', active: 'tlb', activeWire: 'a_tlb', tlbHit: 1,
    }, 'Hit! The TLB already has VPN 1 → frame 7 from a recent access. This is the common case — thanks to locality, most accesses hit the TLB (often >99%). No page table lookup is needed at all. The translation is done in a single cycle.');
    s(4, 'TLB Hit', {
        show: ['addr', 'tlb', 'pt'], pipeline: true, addr: { vpn: '1', offset: '0x02C', pfn: '7' },
        token: 'f7', tokenLabel: 'f7', tokenColor: 'ok', activeFrame: 7, activeWire: 'tlb_ram', tlbHit: 1,
    }, 'The frame number 7 is glued to the untouched offset 0x02C, forming the physical address 0x7·02C, and the token lands in frame 7 in real RAM. The whole translation was invisible and nearly free. This is why the TLB exists: to make the illusion cost almost nothing on the hot path.');

    // ═══ ACT 5: TLB Miss → Page Table Walk ═══
    s(5, 'Page Table Walk', {
        show: ['addr', 'tlb', 'pt'], pipeline: true, addr: { vpn: '4', offset: '0x108' },
        token: 'tlb', tokenLabel: 'VPN4', tokenColor: 'req', active: 'tlb', activeWire: 'a_tlb', tlbMiss: true,
    }, 'Now a different access: VPN 4. The token checks the TLB first — but VPN 4 is not cached. A TLB miss. The hardware cannot give up; it must consult the full map. So it falls back to the page table, which lives in RAM and has an entry for every page.');
    s(5, 'Page Table Walk', {
        show: ['addr', 'tlb', 'pt'], pipeline: true, addr: { vpn: '4', offset: '0x108' },
        token: 'pt', tokenLabel: 'VPN4', tokenColor: 'req', active: 'pt', activeWire: 'a_pt', activePT: 4,
    }, 'The MMU walks the page table, indexing directly to the VPN 4 entry. There it finds frame 2, present in memory. A page-table lookup costs a real RAM access (or several, since real page tables are multi-level trees) — far slower than a TLB hit, which is exactly why the TLB is worth having.');
    s(5, 'Page Table Walk', {
        show: ['addr', 'tlb', 'pt'], pipeline: true, addr: { vpn: '4', offset: '0x108', pfn: '2' },
        token: 'tlb', tokenLabel: 'VPN4', tokenColor: 'ok', activeWire: 'pt_tlb',
        tlb: [{ vpn: 1, pfn: 7 }, { vpn: 4, pfn: 2 }], tlbHit: 4,
    }, 'Crucially, before continuing, the hardware writes the fresh translation VPN 4 → frame 2 back into the TLB (watch it replace an old entry). So the next access to page 4 will be a fast hit. This is temporal locality paying off: pay the walk once, then ride the cache.');
    s(5, 'Page Table Walk', {
        show: ['addr', 'tlb', 'pt'], pipeline: true, addr: { vpn: '4', offset: '0x108', pfn: '2' },
        token: 'f2', tokenLabel: 'f2', tokenColor: 'ok', activeFrame: 2, activeWire: 'pt_ram',
        tlb: [{ vpn: 1, pfn: 7 }, { vpn: 4, pfn: 2 }],
    }, 'With frame 2 in hand, the offset is appended and the access completes in physical frame 2. TLB miss handled, translation cached, data reached. The program still saw only its virtual address — it has no idea a page-table walk just happened on its behalf.');

    // ═══ ACT 6: Page Fault ═══
    s(6, 'Page Fault', {
        show: ['addr', 'tlb', 'pt', 'disk'], pipeline: true, addr: { vpn: '2', offset: '0x040' },
        token: 'pt', tokenLabel: 'VPN2', tokenColor: 'req', active: 'pt', activeWire: 'a_pt', activePT: 2,
    }, 'The dramatic case: an access to VPN 2. TLB miss, so we walk the page table — but the entry says "not present". The page is not in RAM at all; it was evicted to disk (swap), or has never been loaded. The hardware cannot resolve this itself. It raises a page fault: a trap into the operating system.');
    s(6, 'Page Fault', {
        show: ['addr', 'tlb', 'pt', 'disk'], pipeline: true, addr: { vpn: '2', offset: '0x040' },
        token: 'disk', tokenLabel: 'load', tokenColor: 'fault', active: 'disk', activeWire: 'pt_disk', activePT: 2,
    }, 'The OS page-fault handler takes over. It finds the page\'s contents on disk and picks a free (or evicted) frame to hold it — here, frame 5. Then it schedules a disk read. This is enormously slow: a disk access is on the order of milliseconds — potentially millions of times slower than the RAM accesses so far. The process is paused meanwhile.');
    s(6, 'Page Fault', {
        show: ['addr', 'tlb', 'pt', 'disk'], pipeline: true, addr: { vpn: '2', offset: '0x040', pfn: '5' },
        token: 'f5', tokenLabel: 'f5', tokenColor: 'fault', faultFrame: 5, activeWire: 'disk_ram',
    }, 'The page is copied from disk into frame 5. The OS updates the page-table entry for VPN 2 to "present → frame 5", and returns from the trap. The CPU simply re-runs the exact instruction that faulted — and this time it sails through. The program never knew it briefly touched the disk. This is demand paging: pages are loaded only when actually used.');

    // ═══ ACT 7: Isolation ═══
    s(7, 'Process Isolation', {
        show: ['pages'], mapping: true,
    }, 'Rewind to the mapping view, because the same machinery buys something priceless: isolation. Process 1\'s page 1 maps to frame 7 (blue arrows show its layout). Each process has its OWN page table — its own private set of mappings.');
    s(7, 'Process Isolation', {
        show: ['pages'], mapping: true, proc2: true,
    }, 'Now process 2 runs. Its page 1 (orange) maps to a completely different frame — frame 3. The identical virtual address 0x1000 means totally different physical memory in each process. There is simply no way for process 2 to name process 1\'s data: a process can only express virtual addresses, and its page table only points at its own frames. Add a "read-only" or "no-execute" bit per entry and you also get memory protection. Virtual memory is the foundation of both isolation and security.');

    // ═══ ACT 8: Why It Wins ═══
    s(8, 'Why It Wins', {
        show: ['addr', 'tlb', 'pt', 'disk'], recap: true,
        wins: [
            { t: 'Isolation & protection', d: 'Each process has private mappings + permission bits — crashes and exploits stay contained.' },
            { t: 'Overcommit', d: 'The sum of all virtual spaces can exceed physical RAM; unused pages simply are not backed.' },
            { t: 'Demand paging & swap', d: 'Load pages only when touched; evict cold pages to disk under pressure.' },
            { t: 'Simple, relocatable programs', d: 'Every program links as if it owns address 0 — no need to know where it really lands.' },
        ],
    }, 'The illusion earns its keep. For the cost of an address split, a TLB, and a page table, virtual memory delivers process isolation, memory protection, the ability to run programs larger than RAM, lazy on-demand loading, and dead-simple program layout. The TLB keeps the common case near-free; the page table and page faults handle the rest. That is the deal the whole modern OS is built on.');

    return steps;
}

// ── Recap overlay (Act 8) ───────────────────────────────────────────────────────
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

// ── Quiz ──────────────────────────────────────────────────────────────────────
const QUIZ = [
    {
        question: 'What does the TLB do, and why does it matter?',
        options: [
            'It stores files on disk for swapping',
            'It caches recent VPN→frame translations so most accesses skip the page table (≈1 cycle)',
            'It splits the virtual address into VPN and offset',
            'It assigns each process its own address space',
        ],
        correct: 1,
        explanation: 'The Translation Lookaside Buffer is a small, very fast hardware cache of recent page translations. On a hit (the common case, thanks to locality) it resolves a VPN to a frame in about one cycle, avoiding a slow page-table walk in RAM.',
    },
    {
        question: 'A page-table entry is marked "not present" when the CPU accesses it. What happens?',
        options: [
            'The program crashes immediately',
            'The offset is used directly as the physical address',
            'A page fault traps into the OS, which loads the page from disk into a free frame and retries the instruction',
            'The TLB is flushed and the access is skipped',
        ],
        correct: 2,
        explanation: 'A not-present entry triggers a page fault — a trap into the OS. The handler brings the page in from disk (swap) into a physical frame, updates the page table to present, and re-runs the faulting instruction. This is demand paging.',
    },
    {
        question: 'How does paging give two processes the same virtual address without conflict?',
        options: [
            'Each process runs on a different CPU core',
            'Virtual addresses are randomized per process',
            'Each process has its own page table, so identical VPNs map to different physical frames',
            'The offset bits differ between processes',
        ],
        correct: 2,
        explanation: 'Every process has a private page table. The same virtual address translates through different mappings to different physical frames, so processes are isolated — one cannot even name another\'s memory. Permission bits per entry add protection on top.',
    },
];

function QuizPanel({ quizState, setQuizState }) {
    const q = QUIZ[quizState.current];
    if (quizState.complete) {
        return (
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-5 text-center">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{QUIZ.length}</div>
                <div className="text-zinc-400 text-sm mb-4">
                    {quizState.score === QUIZ.length ? 'Perfect — you understand how virtual memory works!' : 'Review the explanations to reinforce the concepts.'}
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

export default function VirtualMemoryAndPagingPage() {
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
                            <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">Virtual Memory &amp; Paging</h1>
                            <p className="text-zinc-300 text-sm mt-1">
                                How every process gets its own private address space — address translation, the TLB, page tables, and page faults, animated end to end
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
                                {step?.recap ? <RecapCards wins={step.wins} /> : <MemoryStage step={step} />}
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

                        {/* Translation reference */}
                        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-3">Address translation</p>
                            <div className="space-y-1.5 text-xs">
                                {[
                                    { acts: [3], label: 'Split address', note: 'VPN + offset' },
                                    { acts: [4], label: 'TLB hit', note: '≈ 1 cycle' },
                                    { acts: [5], label: 'Page-table walk', note: 'RAM access' },
                                    { acts: [6], label: 'Page fault', note: 'disk — ms' },
                                    { acts: [7], label: 'Per-process table', note: 'isolation' },
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
