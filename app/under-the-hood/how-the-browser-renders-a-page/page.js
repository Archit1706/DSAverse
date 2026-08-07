"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info,
    Code2, Network, Palette, Filter, Ruler, Brush, Layers, Gauge,
} from 'lucide-react';

// ── Acts ──────────────────────────────────────────────────────────────────────
const ACTS = [
    { id: 1, label: 'Tokens',    icon: Code2   },
    { id: 2, label: 'DOM',       icon: Network },
    { id: 3, label: 'CSSOM',     icon: Palette },
    { id: 4, label: 'Render Tree', icon: Filter },
    { id: 5, label: 'Layout',    icon: Ruler   },
    { id: 6, label: 'Paint',     icon: Brush   },
    { id: 7, label: 'Composite', icon: Layers  },
    { id: 8, label: 'Fast Path', icon: Gauge   },
];

// ── Pipeline rail geometry ─────────────────────────────────────────────────────
const RAIL = [
    { id: 'html',   label: 'HTML',      sub: 'bytes',    x: 18,  y: 49,  w: 80,  h: 42 },
    { id: 'dom',    label: 'DOM',       sub: 'tree',     x: 128, y: 49,  w: 80,  h: 42 },
    { id: 'css',    label: 'CSS',       sub: 'bytes',    x: 18,  y: 109, w: 80,  h: 42 },
    { id: 'cssom',  label: 'CSSOM',     sub: 'tree',     x: 128, y: 109, w: 80,  h: 42 },
    { id: 'render', label: 'Render',    sub: 'tree',     x: 250, y: 75,  w: 95,  h: 50 },
    { id: 'layout', label: 'Layout',    sub: 'geometry', x: 375, y: 75,  w: 85,  h: 50 },
    { id: 'paint',  label: 'Paint',     sub: 'pixels',   x: 490, y: 75,  w: 85,  h: 50 },
    { id: 'comp',   label: 'Composite', sub: 'GPU',      x: 605, y: 75,  w: 105, h: 50 },
];
const WIRES = [
    { id: 'h-d', d: 'M98,70 L124,70'   },
    { id: 'c-c', d: 'M98,130 L124,130' },
    { id: 'd-r', d: 'M208,74 L246,90'  },
    { id: 'm-r', d: 'M208,126 L246,111' },
    { id: 'r-l', d: 'M345,100 L371,100' },
    { id: 'l-p', d: 'M460,100 L486,100' },
    { id: 'p-c', d: 'M575,100 L601,100' },
];

// The tiny page every act works on
const SOURCE_HTML = ['<body>', '  <h1>Hello</h1>', '  <p class="note">Web page</p>', '  <div class="ad">Ad</div>', '</body>'];
const SOURCE_CSS  = ['body  { font: 16px sans-serif }', 'h1    { font-size: 32px; font-weight: 700 }', '.note { color: #94a3b8 }', '.ad   { display: none }'];

const TOKENS = [
    { t: '<body>',  k: 'open' }, { t: '<h1>', k: 'open' }, { t: 'Hello', k: 'text' }, { t: '</h1>', k: 'close' },
    { t: '<p>',     k: 'open' }, { t: 'Web page', k: 'text' }, { t: '</p>', k: 'close' },
    { t: '<div>',   k: 'open' }, { t: 'Ad', k: 'text' }, { t: '</div>', k: 'close' }, { t: '</body>', k: 'close' },
];

// Shared tree geometry — DOM, CSSOM and the render tree all reuse these coordinates
const TREE = [
    { id: 'html', x: 380, y: 190, dom: 'html',       css: '—',             kind: 'el',  parent: null   },
    { id: 'body', x: 380, y: 243, dom: 'body',       css: 'font 16px',     kind: 'el',  parent: 'html' },
    { id: 'h1',   x: 225, y: 298, dom: 'h1',         css: '32px · 700',    kind: 'el',  parent: 'body' },
    { id: 'p',    x: 385, y: 298, dom: 'p.note',     css: 'color #94a3b8', kind: 'el',  parent: 'body' },
    { id: 'div',  x: 555, y: 298, dom: 'div.ad',     css: 'display: none', kind: 'el',  parent: 'body' },
    { id: 't1',   x: 225, y: 353, dom: '"Hello"',    css: 'inherit',       kind: 'txt', parent: 'h1'   },
    { id: 't2',   x: 385, y: 353, dom: '"Web page"', css: 'inherit',       kind: 'txt', parent: 'p'    },
    { id: 't3',   x: 555, y: 353, dom: '"Ad"',       css: 'inherit',       kind: 'txt', parent: 'div'  },
];
const NW = 92, NH = 26;
const DROPPED = ['div', 't3'];   // display:none → never enters the render tree

// ── Persistent animated stage ──────────────────────────────────────────────────
function RenderStage({ step }) {
    const done = step.railDone || [];

    const boxFill = (id) => {
        if (step.rail === id) return { fill: '#3f3f46', stroke: '#e4e4e7', sw: 2.2 };
        if (done.includes(id)) return { fill: '#14532d', stroke: '#22c55e', sw: 1.6 };
        return { fill: '#1e293b', stroke: '#334155', sw: 1.4 };
    };

    return (
        <svg viewBox="0 0 760 430" width="100%" className="max-h-[430px] select-none">
            <style>{`
                .br-flow { stroke-dasharray: 6 5; animation: brdash 0.55s linear infinite; }
                @keyframes brdash { to { stroke-dashoffset: -22; } }
                .br-box  { transition: fill .4s ease, stroke .4s ease; }
                .br-node { transition: opacity .45s ease, fill .45s ease, stroke .45s ease; }
                .br-fade { transition: opacity .5s ease; }
                .br-grow { transition: width .6s cubic-bezier(.45,0,.15,1), height .6s cubic-bezier(.45,0,.15,1), fill .5s ease; }
            `}</style>
            <defs>
                <marker id="brah" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="userSpaceOnUse">
                    <path d="M0,0 L6,3 L0,6 Z" fill="context-stroke" />
                </marker>
            </defs>

            {/* ── Pipeline rail (always visible) ── */}
            {WIRES.map(w => (
                <path key={w.id} d={w.d} fill="none"
                    stroke={step.wire === w.id ? '#e4e4e7' : '#334155'} strokeWidth="2"
                    markerEnd="url(#brah)" className={step.wire === w.id ? 'br-flow' : ''} />
            ))}
            {RAIL.map(b => {
                const st = boxFill(b.id);
                return (
                    <g key={b.id}>
                        <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="8" className="br-box"
                            fill={st.fill} stroke={st.stroke} strokeWidth={st.sw} />
                        <text x={b.x + b.w / 2} y={b.y + b.h / 2 - 1} textAnchor="middle" fontSize="13" fontWeight="bold"
                            fill={step.rail === b.id ? '#f8fafc' : done.includes(b.id) ? '#bbf7d0' : '#cbd5e1'} fontFamily="monospace">{b.label}</text>
                        <text x={b.x + b.w / 2} y={b.y + b.h / 2 + 13} textAnchor="middle" fontSize="9"
                            fill="#94a3b8" fontFamily="monospace">{b.sub}</text>
                    </g>
                );
            })}
            <text x="380" y="26" textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="monospace">
                the critical rendering path — two parsers feed one tree
            </text>

            {/* ── Scene: token stream ── */}
            {step.scene === 'tokens' && (
                <g className="br-fade">
                    <text x="380" y="200" textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="monospace">
                        the tokenizer walks the bytes and emits one token at a time →
                    </text>
                    {TOKENS.map((tk, i) => {
                        const shown = i < (step.tokenCount ?? 0);
                        const col = tk.k === 'text' ? { f: '#1e293b', s: '#475569', t: '#cbd5e1' }
                            : tk.k === 'open' ? { f: '#172554', s: '#3b82f6', t: '#93c5fd' }
                            : { f: '#1e1b4b', s: '#6366f1', t: '#a5b4fc' };
                        const cols = 4, cw = 168, chh = 40;
                        const x = 88 + (i % cols) * cw, y = 225 + Math.floor(i / cols) * chh;
                        return (
                            <g key={i} className="br-node" style={{ opacity: shown ? 1 : 0.08, transitionDelay: `${(i % cols) * 60}ms` }}>
                                <rect x={x} y={y} width={150} height={30} rx="6" fill={col.f} stroke={col.s} strokeWidth="1.4" />
                                <text x={x + 75} y={y + 20} textAnchor="middle" fontSize="12" fill={col.t} fontFamily="monospace">{tk.t}</text>
                            </g>
                        );
                    })}
                    <text x="380" y="410" textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="monospace">
                        start tags · text · end tags — no structure yet, just a flat stream
                    </text>
                </g>
            )}

            {/* ── Scene: DOM / CSSOM / render tree (same geometry, three passes) ── */}
            {['dom', 'cssom', 'render'].includes(step.scene) && (() => {
                const shown = step.nodeCount ?? TREE.length;
                const isDropped = id => step.scene === 'render' && step.dropped && DROPPED.includes(id);
                const visible = (id) => TREE.findIndex(n => n.id === id) < shown;

                return (
                    <g className="br-fade">
                        {/* edges */}
                        {TREE.filter(n => n.parent).map(n => {
                            const p = TREE.find(t => t.id === n.parent);
                            const on = visible(n.id) && visible(n.parent);
                            const cut = isDropped(n.id);
                            return (
                                <line key={`e-${n.id}`} className="br-node"
                                    x1={p.x} y1={p.y + NH / 2} x2={n.x} y2={n.y - NH / 2}
                                    stroke={cut ? '#7f1d1d' : on ? '#475569' : '#1e293b'} strokeWidth="1.5"
                                    strokeDasharray={cut ? '4 4' : 'none'}
                                    style={{ opacity: on ? (cut ? 0.5 : 1) : 0.1 }} />
                            );
                        })}
                        {/* nodes */}
                        {TREE.map((n, i) => {
                            const on = i < shown;
                            const cut = isDropped(n.id);
                            const label = step.scene === 'cssom' ? n.css : n.dom;
                            const txt = n.kind === 'txt';
                            const fill = cut ? '#3a0d0d' : step.scene === 'cssom' ? '#2e1065' : txt ? '#0f172a' : '#1e293b';
                            const stroke = cut ? '#ef4444' : step.scene === 'cssom' ? '#a78bfa' : txt ? '#475569' : '#64748b';
                            const tcol = cut ? '#fca5a5' : step.scene === 'cssom' ? '#ddd6fe' : txt ? '#94a3b8' : '#e2e8f0';
                            return (
                                <g key={n.id} className="br-node" style={{ opacity: on ? (cut ? 0.45 : 1) : 0.06, transitionDelay: `${i * 70}ms` }}>
                                    <rect x={n.x - NW / 2} y={n.y - NH / 2} width={NW} height={NH} rx={txt ? 4 : 7}
                                        fill={fill} stroke={stroke} strokeWidth="1.5" strokeDasharray={txt ? '3 3' : 'none'} />
                                    <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize="11"
                                        fill={tcol} fontFamily="monospace">{label}</text>
                                    {cut && <line x1={n.x - NW / 2} y1={n.y} x2={n.x + NW / 2} y2={n.y} stroke="#ef4444" strokeWidth="1.6" />}
                                </g>
                            );
                        })}
                        <text x="380" y="405" textAnchor="middle" fontSize="11"
                            fill={step.scene === 'render' && step.dropped ? '#ef4444' : '#64748b'} fontFamily="monospace">
                            {step.caption}
                        </text>
                    </g>
                );
            })()}

            {/* ── Scene: layout / paint (shared viewport) ── */}
            {['layout', 'paint'].includes(step.scene) && (() => {
                const VX = 215, VY = 190, VW = 330, VH = 200;
                const boxes = [
                    { id: 'h1', y: VY + 14, h: 48, label: 'h1',     text: 'Hello',    fs: 22, color: '#f8fafc' },
                    { id: 'p',  y: VY + 72, h: 26, label: 'p.note', text: 'Web page', fs: 13, color: '#94a3b8' },
                ];
                const laid = step.laid ?? 0;
                const painted = step.painted ?? 0;
                return (
                    <g className="br-fade">
                        {/* viewport chrome */}
                        <rect x={VX} y={VY} width={VW} height={VH} rx="8" fill="#020617" stroke="#334155" strokeWidth="1.6" />
                        <text x={VX} y={VY - 8} fontSize="10" fill="#64748b" fontFamily="monospace">viewport — 330px wide</text>

                        {boxes.map((b, i) => {
                            const hasGeom = i < laid;
                            const isPainted = i < painted;
                            return (
                                <g key={b.id}>
                                    <rect className="br-grow" x={VX + 10} y={b.y}
                                        width={hasGeom ? VW - 20 : 0} height={hasGeom ? b.h : 0} rx="4"
                                        fill={isPainted ? (b.id === 'h1' ? '#1e3a5f' : '#1e293b') : 'none'}
                                        stroke={isPainted ? '#64748b' : '#3b82f6'} strokeWidth="1.4"
                                        strokeDasharray={isPainted ? 'none' : '5 4'}
                                        style={{ transitionDelay: `${i * 220}ms` }} />
                                    {isPainted && (
                                        <text x={VX + 20} y={b.y + b.h / 2 + b.fs / 3} fontSize={b.fs} fontWeight={b.id === 'h1' ? 'bold' : 'normal'}
                                            fill={b.color} className="br-node">{b.text}</text>
                                    )}
                                    {hasGeom && !isPainted && (
                                        <text x={VX + VW - 26} y={b.y + b.h / 2 + 4} textAnchor="end" fontSize="10"
                                            fill="#60a5fa" fontFamily="monospace">{`${b.label}  310 × ${b.h}`}</text>
                                    )}
                                </g>
                            );
                        })}

                        {/* the display:none element, showing it takes zero space */}
                        {laid >= 2 && (
                            <g className="br-fade" style={{ opacity: 0.6 }}>
                                <line x1={VX + 10} y1={VY + 106} x2={VX + VW - 10} y2={VY + 106} stroke="#7f1d1d" strokeWidth="1.4" strokeDasharray="4 4" />
                                <text x={VX + VW / 2} y={VY + 122} textAnchor="middle" fontSize="10" fill="#ef4444" fontFamily="monospace">
                                    div.ad — 0 × 0, no box at all
                                </text>
                            </g>
                        )}

                        <text x="380" y="412" textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="monospace">{step.caption}</text>
                    </g>
                );
            })()}

            {/* ── Scene: compositing layers ── */}
            {step.scene === 'composite' && (() => {
                const layers = [
                    { i: 0, label: 'base layer — document', fill: '#1e293b', stroke: '#475569' },
                    { i: 1, label: 'promoted — will-change: transform', fill: '#14532d', stroke: '#22c55e' },
                    { i: 2, label: 'promoted — fixed header', fill: '#172554', stroke: '#3b82f6' },
                ];
                return (
                    <g className="br-fade">
                        {layers.map(l => {
                            const x = 200 + l.i * 46, y = 320 - l.i * 62;
                            const on = l.i < (step.layerCount ?? 3);
                            const shifted = step.shift && l.i === 1;
                            return (
                                <g key={l.i} className="br-node"
                                    style={{ opacity: on ? 1 : 0.07, transitionDelay: `${l.i * 130}ms` }}>
                                    <g style={{ transform: shifted ? 'translate(26px, -10px)' : 'translate(0,0)', transition: 'transform .7s cubic-bezier(.45,0,.15,1)' }}>
                                        <path d={`M${x},${y} L${x + 210},${y - 46} L${x + 210},${y + 24} L${x},${y + 70} Z`}
                                            fill={l.fill} stroke={l.stroke} strokeWidth="1.6" opacity="0.92" />
                                        <text x={x + 105} y={y + 20} textAnchor="middle" fontSize="10"
                                            fill={l.stroke} fontFamily="monospace">layer {l.i}</text>
                                    </g>
                                    <text x={x + 232} y={y - 12} fontSize="10" fill="#94a3b8" fontFamily="monospace">{l.label}</text>
                                </g>
                            );
                        })}
                        <text x="380" y="412" textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="monospace">{step.caption}</text>
                    </g>
                );
            })()}

            {/* ── Scene: cost of each entry point ── */}
            {step.scene === 'cost' && (() => {
                const rows = [
                    { label: 'width / top / font-size', stages: 'Layout → Paint → Composite', w: 100, color: '#ef4444' },
                    { label: 'background / color',      stages: 'Paint → Composite',          w: 62,  color: '#f59e0b' },
                    { label: 'transform / opacity',     stages: 'Composite only',             w: 24,  color: '#22c55e' },
                ];
                return (
                    <g className="br-fade">
                        <text x="380" y="192" textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="monospace">
                            what a style change costs depends on where it re-enters the pipeline
                        </text>
                        {rows.map((r, i) => {
                            const y = 224 + i * 62;
                            const on = i < (step.costCount ?? 3);
                            return (
                                <g key={r.label} className="br-node" style={{ opacity: on ? 1 : 0.08, transitionDelay: `${i * 160}ms` }}>
                                    <text x={40} y={y + 4} fontSize="11" fill="#cbd5e1" fontFamily="monospace">{r.label}</text>
                                    <rect x={40} y={y + 14} width={540} height={20} rx="5" fill="#0f172a" stroke="#1e293b" strokeWidth="1" />
                                    <rect className="br-grow" x={40} y={y + 14} width={on ? (540 * r.w) / 100 : 0} height={20} rx="5"
                                        fill={r.color} style={{ transitionDelay: `${i * 160}ms` }} />
                                    <text x={596} y={y + 28} fontSize="10" fill={r.color} fontFamily="monospace">{r.stages}</text>
                                </g>
                            );
                        })}
                        <text x="380" y="412" textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="monospace">{step.caption}</text>
                    </g>
                );
            })()}

            {/* ── Scene: layout thrashing ── */}
            {step.scene === 'thrash' && (() => {
                const lines = [
                    { t: 'for (const el of boxes) {', kind: 'plain' },
                    { t: '  const h = el.offsetHeight;   // READ  → forces reflow', kind: 'read' },
                    { t: '  el.style.height = h * 2 + "px";  // WRITE → invalidates', kind: 'write' },
                    { t: '}', kind: 'plain' },
                ];
                const good = [
                    { t: 'const hs = boxes.map(el => el.offsetHeight);  // all READS', kind: 'read' },
                    { t: 'boxes.forEach((el, i) => el.style.height = hs[i] * 2 + "px");  // all WRITES', kind: 'write' },
                ];
                const show = step.thrash;
                return (
                    <g className="br-fade">
                        <text x="42" y="190" fontSize="11" fill={show === 'bad' ? '#ef4444' : '#64748b'} fontFamily="monospace">
                            ✕ interleaved read/write — one forced reflow per iteration
                        </text>
                        {lines.map((l, i) => (
                            <text key={i} x={42} y={214 + i * 22} fontSize="12" fontFamily="monospace"
                                fill={show === 'bad' && l.kind === 'read' ? '#fca5a5' : show === 'bad' && l.kind === 'write' ? '#fcd34d' : '#64748b'}>{l.t}</text>
                        ))}
                        {show === 'bad' && Array.from({ length: 6 }).map((_, i) => (
                            <g key={i} className="br-node" style={{ transitionDelay: `${i * 90}ms` }}>
                                <rect x={42 + i * 44} y={312} width={36} height={16} rx="3" fill="#3a0d0d" stroke="#ef4444" strokeWidth="1.2" />
                                <text x={60 + i * 44} y={324} textAnchor="middle" fontSize="8" fill="#fca5a5" fontFamily="monospace">reflow</text>
                            </g>
                        ))}
                        {show === 'good' && (
                            <g className="br-fade">
                                <text x="42" y="330" fontSize="11" fill="#22c55e" fontFamily="monospace">✓ batched — read everything, then write everything</text>
                                {good.map((l, i) => (
                                    <text key={i} x={42} y={354 + i * 22} fontSize="12" fontFamily="monospace"
                                        fill={l.kind === 'read' ? '#86efac' : '#fcd34d'}>{l.t}</text>
                                ))}
                                <g>
                                    <rect x={600} y={312} width={40} height={16} rx="3" fill="#14532d" stroke="#22c55e" strokeWidth="1.2" />
                                    <text x={620} y={324} textAnchor="middle" fontSize="8" fill="#86efac" fontFamily="monospace">1 reflow</text>
                                </g>
                            </g>
                        )}
                    </g>
                );
            })()}
        </svg>
    );
}

// ── Source panes (Act 1 & 3) ────────────────────────────────────────────────────
function SourceScene({ kind, highlight }) {
    const lines = kind === 'css' ? SOURCE_CSS : SOURCE_HTML;
    return (
        <div className="w-full py-2">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2 px-1">
                {kind === 'css' ? 'styles.css — bytes off the wire' : 'index.html — bytes off the wire'}
            </div>
            <div className="rounded-xl border border-slate-700/60 bg-slate-950/70 p-4 font-mono text-sm space-y-1">
                {lines.map((l, i) => (
                    <div key={i} className={`px-2 py-0.5 rounded transition-colors duration-500 ${
                        highlight === i ? 'bg-zinc-700/60 text-zinc-100' : 'text-slate-500'
                    }`}>
                        <span className="text-slate-700 mr-3 select-none">{String(i + 1).padStart(2, '0')}</span>
                        {l}
                    </div>
                ))}
            </div>
            <p className="text-[11px] text-slate-600 text-center mt-3 font-mono">
                {kind === 'css'
                    ? 'CSS is render-blocking — the browser will not paint until it has the CSSOM'
                    : 'HTML parsing is incremental — the browser starts building before the last byte arrives'}
            </p>
        </div>
    );
}

// ── Recap (Act 8) ───────────────────────────────────────────────────────────────
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

    // ═══ ACT 1: Bytes → Tokens ═══
    s(1, 'Bytes to Tokens', { source: 'html', rail: 'html' },
        'The server sends back a stream of bytes. Before anything can be drawn, the browser has to turn those bytes into structure. It decodes them to characters using the declared encoding, then hands them to the HTML tokenizer. Nothing on screen yet — this is a tiny page, but every page starts exactly here.');
    s(1, 'Bytes to Tokens', { source: 'html', highlight: 1, rail: 'html' },
        'The tokenizer is a state machine. It scans left to right and recognizes three kinds of things: start tags, end tags, and the text between them. It does not care about nesting or validity yet — it just classifies characters into tokens as fast as it can.');
    s(1, 'Bytes to Tokens', { scene: 'tokens', tokenCount: 4, rail: 'html', wire: 'h-d' },
        'Out come the first tokens: a <body> start tag, an <h1> start tag, the text "Hello", an </h1> end tag. Notice this is still a flat list — no parent/child relationships exist at this point. Tokens are the raw material the tree builder consumes.');
    s(1, 'Bytes to Tokens', { scene: 'tokens', tokenCount: 11, rail: 'html', wire: 'h-d' },
        'The whole document tokenizes into eleven tokens. Crucially this happens incrementally: the browser tokenizes and builds as bytes arrive, which is why you see content appear on a slow connection before the page has finished downloading. A blocking <script> in the middle would stop this stream cold until the script has been fetched and executed.');

    // ═══ ACT 2: The DOM ═══
    s(2, 'Building the DOM', { scene: 'dom', nodeCount: 2, rail: 'dom', railDone: ['html'], caption: 'each start tag opens a node; it closes when its end tag arrives' },
        'Now the tree builder turns the token stream into the DOM — a tree of node objects. A start tag creates a node and pushes it onto a stack of open elements; the matching end tag pops it. That stack is exactly what gives you nesting from a flat stream.');
    s(2, 'Building the DOM', { scene: 'dom', nodeCount: 5, rail: 'dom', railDone: ['html'], caption: 'element nodes carry tag name, attributes, and children' },
        'body gains three element children: h1, p (with class "note"), and div (with class "ad"). Attributes ride along on each node. The DOM is a real in-memory object graph, not the text you wrote — which is why it can be mutated later by JavaScript, and why "view source" and the elements panel can disagree.');
    s(2, 'Building the DOM', { scene: 'dom', nodeCount: 8, rail: 'dom', railDone: ['html'], caption: 'text is a node too — the leaves of the tree' },
        'Text becomes nodes as well (drawn dashed here). The DOM is now complete — this is the moment DOMContentLoaded fires. But notice what the DOM does not contain: any information about colour, size, or position. It is pure structure and content. Presentation lives in an entirely separate tree.');

    // ═══ ACT 3: The CSSOM ═══
    s(3, 'Building the CSSOM', { source: 'css', rail: 'css', railDone: ['html', 'dom'], wire: 'c-c' },
        'In parallel the browser fetches and parses the CSS. This is why stylesheets are called render-blocking: the browser deliberately refuses to paint until it has the complete CSSOM, because painting with partial styles would produce a flash of unstyled content and then a jarring restyle.');
    s(3, 'Building the CSSOM', { source: 'css', highlight: 3, rail: 'cssom', railDone: ['html', 'dom'], wire: 'c-c' },
        'Each rule is parsed into a selector plus declarations. Selectors are actually matched right to left — for ".ad" the engine finds every element with that class rather than walking down from the root, which is far cheaper on a big document.');
    s(3, 'Building the CSSOM', { scene: 'cssom', nodeCount: 8, rail: 'cssom', railDone: ['html', 'dom'], caption: 'computed style for every node — cascade + inheritance resolved' },
        'The CSSOM is a tree too, mirroring the document, and here is why that matters: styles cascade downward. body sets font: 16px, and h1, p and the text nodes inherit from it unless they override. The browser resolves specificity, source order, and inheritance to produce one final computed style per node. Same tree shape as the DOM, completely different payload.');

    // ═══ ACT 4: The Render Tree ═══
    s(4, 'The Render Tree', { scene: 'render', nodeCount: 8, rail: 'render', railDone: ['html', 'dom', 'cssom'], wire: 'd-r', caption: 'DOM structure + CSSOM styles, combined node by node' },
        'The two trees now merge. The browser walks the DOM and attaches each node\'s computed style to produce the render tree — the tree of things that will actually be drawn. Structure from one side, appearance from the other.');
    s(4, 'The Render Tree', { scene: 'render', nodeCount: 8, dropped: true, rail: 'render', railDone: ['html', 'dom', 'cssom'], caption: 'display: none → excluded entirely, along with its subtree' },
        'And this is where the render tree diverges from the DOM. div.ad had display: none, so it and its whole subtree are simply not included. It exists in the DOM — JavaScript can still find it and read it — but it will never be laid out, never be painted, and occupies zero space. This is the real difference from visibility: hidden, which stays in the render tree, still gets a box and still takes up space; it just is not painted.');

    // ═══ ACT 5: Layout ═══
    s(5, 'Layout (Reflow)', { scene: 'layout', laid: 0, rail: 'layout', railDone: ['html', 'dom', 'cssom', 'render'], wire: 'r-l', caption: 'nothing has a position or size yet — only the viewport is known' },
        'The render tree says what to draw and in what style, but still nothing about where. Layout — also called reflow — is the pass that computes geometry. It starts from the viewport, whose width is the one dimension known up front, and works down the tree.');
    s(5, 'Layout (Reflow)', { scene: 'layout', laid: 1, rail: 'layout', railDone: ['html', 'dom', 'cssom', 'render'], caption: 'h1 — block level, so it fills the available width' },
        'h1 is a block-level box, so it takes the full available width; its height comes from the 32px line box its text needs. Every relative unit gets resolved to absolute pixels here — percentages, em, rem, flex fractions, auto margins. This is where a "50% width" finally becomes 155px.');
    s(5, 'Layout (Reflow)', { scene: 'layout', laid: 2, rail: 'layout', railDone: ['html', 'dom', 'cssom', 'render'], caption: 'p flows directly below — and div.ad occupies no space at all' },
        'p is placed immediately below h1 in normal flow. Note what is absent: div.ad contributes nothing, not even an empty gap, because it never made it into the render tree. Layout is the expensive pass — a change near the root can force the browser to recompute geometry for the entire subtree beneath it.');

    // ═══ ACT 6: Paint ═══
    s(6, 'Paint', { scene: 'paint', laid: 2, painted: 0, rail: 'paint', railDone: ['html', 'dom', 'cssom', 'render', 'layout'], wire: 'l-p', caption: 'boxes have geometry — now fill in actual pixels' },
        'With geometry settled, paint converts each box into actual pixels: backgrounds, borders, shadows, text glyphs, images. The browser records these as a list of draw operations — effectively a display list — rather than painting straight to the screen.');
    s(6, 'Paint', { scene: 'paint', laid: 2, painted: 1, rail: 'paint', railDone: ['html', 'dom', 'cssom', 'render', 'layout'], caption: 'painted back to front, following the stacking order' },
        'Order matters. Painting goes back to front so later content correctly covers earlier content — backgrounds first, then floats, then inline content, then anything positioned. z-index and stacking contexts are just rules for reordering this sequence.');
    s(6, 'Paint', { scene: 'paint', laid: 2, painted: 2, rail: 'paint', railDone: ['html', 'dom', 'cssom', 'render', 'layout'], caption: 'first contentful paint — the user finally sees something' },
        'Both boxes are painted and the user sees content for the first time — this is the moment First Contentful Paint records. Repainting is cheaper than reflow because geometry is already known, but it is far from free: a full-page repaint still touches every pixel in the affected region.');

    // ═══ ACT 7: Composite ═══
    s(7, 'Compositing', { scene: 'composite', layerCount: 1, rail: 'comp', railDone: ['html', 'dom', 'cssom', 'render', 'layout', 'paint'], wire: 'p-c', caption: 'most content paints into a single base layer' },
        'The painted output is not one flat image. The browser splits the page into compositor layers — most content shares one base layer, which keeps memory sane.');
    s(7, 'Compositing', { scene: 'composite', layerCount: 3, rail: 'comp', railDone: ['html', 'dom', 'cssom', 'render', 'layout', 'paint'], caption: 'certain elements get promoted to their own layer' },
        'Some elements get promoted to their own layer: 3D transforms, video, canvas, position: fixed, and anything you hint with will-change: transform. Each layer is uploaded to the GPU as a texture. Promotion is not free — every layer costs memory — so promoting everything backfires badly.');
    s(7, 'Compositing', { scene: 'composite', layerCount: 3, shift: true, rail: 'comp', railDone: ['html', 'dom', 'cssom', 'render', 'layout', 'paint'], caption: 'moving a layer = a GPU transform, no layout, no paint' },
        'Now the payoff. Moving a promoted layer is just the GPU re-blending existing textures at a new offset — no layout, no paint, no main-thread work at all. That is why a transform-based animation can hold 60fps while an equivalent animation on "top" or "left" stutters: one re-enters the pipeline at the last stage, the other at the first.');

    // ═══ ACT 8: The Fast Path ═══
    s(8, 'The Fast Path', { scene: 'cost', costCount: 1, rail: 'layout', railDone: ['html', 'dom', 'cssom', 'render'], caption: 'geometry properties restart the pipeline from layout' },
        'Once the page is up, every style change re-enters this pipeline — the question is where. Change width, top, margin or font-size and you invalidate geometry, so the browser must redo layout, then paint, then composite. The most expensive path there is.');
    s(8, 'The Fast Path', { scene: 'cost', costCount: 2, rail: 'paint', railDone: ['html', 'dom', 'cssom', 'render', 'layout'], caption: 'paint-only properties skip layout entirely' },
        'Change a colour, background or box-shadow and geometry is untouched, so layout is skipped — the browser repaints the affected region and composites. Meaningfully cheaper, though still main-thread work proportional to the area involved.');
    s(8, 'The Fast Path', { scene: 'cost', costCount: 3, rail: 'comp', railDone: ['html', 'dom', 'cssom', 'render', 'layout', 'paint'], caption: 'transform and opacity are the two composite-only properties' },
        'And transform and opacity on a promoted layer skip both. No layout, no paint — the compositor just re-blends textures it already has, often off the main thread entirely. This is the single most useful performance fact about CSS: animate transform and opacity, not width/top/left.');
    s(8, 'The Fast Path', { scene: 'thrash', thrash: 'bad', rail: 'layout', railDone: ['html', 'dom', 'cssom', 'render'] },
        'One more trap, and it is a common one. The browser normally batches your DOM writes and reflows once per frame. But if you read a geometry property like offsetHeight, it must flush all pending changes immediately to give you an accurate answer. Interleave a read and a write inside a loop and you force a synchronous reflow on every single iteration — layout thrashing. Ten items, ten full reflows.');
    s(8, 'The Fast Path', { scene: 'thrash', thrash: 'good', rail: 'layout', railDone: ['html', 'dom', 'cssom', 'render'] },
        'The fix costs nothing: batch the reads, then batch the writes. All the measurements resolve against one layout, and all the mutations coalesce into a single reflow at the end of the frame. Same code, same result, one reflow instead of ten. Libraries formalise this as a read phase and a write phase.');
    s(8, 'The Fast Path', {
        recap: true,
        wins: [
            { t: 'HTML → DOM, CSS → CSSOM', d: 'Two independent parsers. CSS is render-blocking; the browser will not paint without a complete CSSOM.' },
            { t: 'Render tree ≠ DOM', d: 'display: none is excluded outright; visibility: hidden stays, gets a box, and still occupies space.' },
            { t: 'Layout > Paint > Composite', d: 'Cost falls sharply at each later stage. Animate transform/opacity so you only pay for the last one.' },
            { t: 'Batch reads and writes', d: 'Reading offsetHeight mid-loop forces a synchronous reflow per iteration. Read everything first, then write.' },
        ],
    }, 'That is the critical rendering path end to end: bytes to tokens to DOM, CSS to CSSOM, merged into a render tree, laid out into boxes, painted into pixels, composited into a frame. Every performance rule you have heard about the front end — inline critical CSS, defer scripts, animate transforms, avoid layout thrashing — is really just a statement about which stage of this pipeline you are forcing the browser to redo, and how often.');

    return steps;
}

// ── Router ──────────────────────────────────────────────────────────────────────
function VisualizationPanel({ step }) {
    if (!step) return null;
    if (step.source) return <SourceScene kind={step.source} highlight={step.highlight} />;
    if (step.recap)  return <RecapCards wins={step.wins} />;
    return <RenderStage step={step} />;
}

// ── Quiz ────────────────────────────────────────────────────────────────────────
const QUIZ = [
    {
        question: 'Which pair of CSS properties can be animated without triggering layout or paint?',
        options: [
            'width and height',
            'top and left',
            'transform and opacity',
            'margin and padding',
        ],
        correct: 2,
        explanation: 'transform and opacity on a promoted compositor layer are handled entirely by the compositor — the GPU re-blends textures that already exist. Everything else in that list changes geometry (forcing layout, then paint, then composite) which is why "left"-based animations stutter where transform-based ones stay smooth.',
    },
    {
        question: 'How does display: none differ from visibility: hidden in the rendering pipeline?',
        options: [
            'They are identical; only the spelling differs',
            'display: none is excluded from the render tree and takes zero space; visibility: hidden stays, is laid out, and still occupies space',
            'visibility: hidden removes the node from the DOM',
            'display: none is painted but with zero opacity',
        ],
        correct: 1,
        explanation: 'display: none keeps the node in the DOM (JavaScript can still reach it) but drops it and its subtree from the render tree entirely — no layout, no paint, no space. visibility: hidden stays in the render tree, gets a real box during layout, still pushes siblings around, and is simply skipped at paint time.',
    },
    {
        question: 'What causes "layout thrashing"?',
        options: [
            'Using too many CSS classes on one element',
            'Loading stylesheets after scripts',
            'Reading a geometry property like offsetHeight and writing a style repeatedly in the same loop, forcing a synchronous reflow each iteration',
            'Having a DOM tree deeper than ten levels',
        ],
        correct: 2,
        explanation: 'The browser batches DOM writes and reflows once per frame, but reading a geometry value forces it to flush pending changes immediately for an accurate answer. Interleaving reads and writes in a loop defeats the batching completely — one forced reflow per iteration. Batch all reads first, then all writes, and you pay for a single reflow.',
    },
];

function QuizPanel({ quizState, setQuizState }) {
    const q = QUIZ[quizState.current];
    if (quizState.complete) {
        return (
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-5 text-center">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{QUIZ.length}</div>
                <div className="text-zinc-400 text-sm mb-4">
                    {quizState.score === QUIZ.length ? 'Perfect — you can read a flame chart now!' : 'Review the explanations to reinforce the pipeline.'}
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

export default function BrowserRenderingPage() {
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
                            <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">How the Browser Renders a Page</h1>
                            <p className="text-zinc-300 text-sm mt-1">
                                The critical rendering path — DOM, CSSOM, render tree, layout, paint, composite — and why transform beats top
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

                        {/* Pipeline reference */}
                        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-3">Pipeline stage</p>
                            <div className="space-y-1.5 text-xs">
                                {[
                                    { acts: [1, 2], label: 'Parse HTML', note: '→ DOM' },
                                    { acts: [3],    label: 'Parse CSS',  note: '→ CSSOM' },
                                    { acts: [4],    label: 'Render tree', note: 'visible only' },
                                    { acts: [5, 8], label: 'Layout',     note: 'geometry · reflow' },
                                    { acts: [6, 8], label: 'Paint',      note: 'pixels · repaint' },
                                    { acts: [7, 8], label: 'Composite',  note: 'GPU layers' },
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
