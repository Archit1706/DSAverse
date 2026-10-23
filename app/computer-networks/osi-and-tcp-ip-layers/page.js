"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Code2,
    Layers, ArrowDown, Cable, Router, ArrowUp, Split, Gauge, CheckCircle,
} from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

// ── Acts ──────────────────────────────────────────────────────────────────────
const ACTS = [
    { id: 1, label: 'Two Models',     icon: Layers     },
    { id: 2, label: 'Down the Stack', icon: ArrowDown  },
    { id: 3, label: 'On the Wire',    icon: Cable      },
    { id: 4, label: 'In Between',     icon: Router     },
    { id: 5, label: 'Up the Stack',   icon: ArrowUp    },
    { id: 6, label: 'Demultiplexing', icon: Split      },
    { id: 7, label: 'Overhead',       icon: Gauge      },
    { id: 8, label: 'Recap',          icon: CheckCircle },
];

// ── The message and its headers — sizes on screen are computed from these ──────
const MESSAGE = 'GET /index.html HTTP/1.1\r\nHost: example.com\r\n\r\n';
const DATA_LEN = MESSAGE.length;              // 47 bytes
const TCP_LEN = 20, IP_LEN = 20, ETH_LEN = 14, FCS_LEN = 4, PREAMBLE = 8, IFG = 12;
const SEGMENT_LEN = DATA_LEN + TCP_LEN;       // 67
const PACKET_LEN = SEGMENT_LEN + IP_LEN;      // 87
const FRAME_LEN = PACKET_LEN + ETH_LEN + FCS_LEN; // 105

const MAC = { laptop: 'aa:bb:cc:00:11:22', gateway: 'de:ad:be:ef:00:01', lastHop: '00:0c:29:aa:bb:cc', server: '00:50:56:12:34:56' };
const IP = { laptop: '192.168.1.42', server: '93.184.216.34' };
const HOPS = 8;  // routers between laptop and server in this example

/** Ethernet pads anything shorter than its 46-byte minimum payload. */
const wireBytes = (payload) => {
    const ethPayload = Math.max(46, payload + TCP_LEN + IP_LEN);
    const frame = ethPayload + ETH_LEN + FCS_LEN;
    return { frame, wire: frame + PREAMBLE + IFG, padded: ethPayload - (payload + TCP_LEN + IP_LEN) };
};
const OVERHEAD_ROWS = [
    { payload: 1,    what: 'one keystroke over SSH' },
    { payload: DATA_LEN, what: 'this GET request' },
    { payload: 512,  what: 'a small JSON reply' },
    { payload: 1460, what: 'a full-size segment (MSS)' },
].map(r => ({ ...r, ...wireBytes(r.payload), eff: r.payload / wireBytes(r.payload).wire }));

// ── Persistent stage geometry ─────────────────────────────────────────────────
const LAYERS = [
    { id: 'app',       name: 'Application', proto: 'HTTP',     pdu: 'message', y: 40,  color: '#ec4899' },
    { id: 'transport', name: 'Transport',   proto: 'TCP',      pdu: 'segment', y: 108, color: '#38bdf8' },
    { id: 'internet',  name: 'Internet',    proto: 'IP',       pdu: 'packet',  y: 176, color: '#a78bfa' },
    { id: 'link',      name: 'Link',        proto: 'Ethernet', pdu: 'frame',   y: 244, color: '#fbbf24' },
];
const ROW_H = 54;
const STACK_W = 132;
const LEFT_X = 10, RIGHT_X = 618;
const WIRE_Y = 352;

/* Segment offsets inside the PDU are fixed; absent ones are simply invisible,
   so a header fades in exactly where it belongs and the data never moves. */
const SEGS = [
    { id: 'eth',  label: 'Eth', w: 46,  fill: '#78350f', stroke: '#fbbf24', text: '#fef3c7' },
    { id: 'ip',   label: 'IP',  w: 46,  fill: '#4c1d95', stroke: '#a78bfa', text: '#ede9fe' },
    { id: 'tcp',  label: 'TCP', w: 46,  fill: '#075985', stroke: '#38bdf8', text: '#e0f2fe' },
    { id: 'data', label: 'GET /index.html', w: 108, fill: '#831843', stroke: '#f472b6', text: '#fce7f3' },
    { id: 'fcs',  label: 'FCS', w: 30,  fill: '#78350f', stroke: '#fbbf24', text: '#fef3c7' },
];
const SEG_X = (() => { let x = 0; const o = {}; for (const s of SEGS) { o[s.id] = x; x += s.w; } return o; })();
const PDU_W = SEGS.reduce((a, s) => a + s.w, 0);
const PDU_H = 30;
const SEND_X = LEFT_X + STACK_W + 10;
const RECV_X = RIGHT_X - 10 - PDU_W;

/** Where the PDU sits for a given side and layer. */
function pduPos(side, layer) {
    if (side === 'wire') {
        const x = layer === 'near' ? SEND_X : layer === 'far' ? RECV_X : SEND_X + (RECV_X - SEND_X) / 2;
        return [x, WIRE_Y - PDU_H / 2];
    }
    const row = LAYERS.find(l => l.id === layer);
    return [side === 'send' ? SEND_X : RECV_X, row.y + (ROW_H - PDU_H) / 2];
}

const PDU_NAME = { app: 'message', transport: 'segment', internet: 'packet', link: 'frame' };
const PDU_SIZE = { app: DATA_LEN, transport: SEGMENT_LEN, internet: PACKET_LEN, link: FRAME_LEN };

function StackStage({ step }) {
    const present = new Set(step.pdu || []);
    const [px, py] = pduPos(step.side, step.layer);
    const onWire = step.side === 'wire';

    const stack = (x, side, title) => (
        <g>
            <text x={x + STACK_W / 2} y={24} textAnchor="middle" fontSize="10" fill="#94a3b8" fontFamily="monospace">{title}</text>
            {LAYERS.map(l => {
                const on = step.side === side && step.layer === l.id;
                return (
                    <g key={l.id}>
                        <rect x={x} y={l.y} width={STACK_W} height={ROW_H} rx="8" className="l-box"
                            fill={on ? '#1e1b2e' : '#0f172a'} stroke={on ? l.color : '#334155'} strokeWidth={on ? 2.2 : 1.2} />
                        <text x={x + 12} y={l.y + 22} fontSize="11" fontWeight="600" fill={on ? '#f8fafc' : '#cbd5e1'}>{l.name}</text>
                        <text x={x + 12} y={l.y + 40} fontSize="9.5" fill={on ? l.color : '#64748b'} fontFamily="monospace">{l.proto} · {l.pdu}</text>
                    </g>
                );
            })}
            <rect x={x} y={WIRE_Y - 22} width={STACK_W} height={44} rx="8" className="l-box"
                fill={onWire ? '#1e1b2e' : '#0f172a'} stroke={onWire ? '#f472b6' : '#334155'} strokeWidth={onWire ? 2 : 1.2} />
            <text x={x + 12} y={WIRE_Y - 2} fontSize="11" fontWeight="600" fill="#cbd5e1">Physical</text>
            <text x={x + 12} y={WIRE_Y + 13} fontSize="9.5" fill="#64748b" fontFamily="monospace">NIC · bits</text>
        </g>
    );

    return (
        <svg viewBox="0 0 760 420" width="100%" className="max-h-[420px] select-none">
            <style>{`
                .l-box { transition: fill .4s ease, stroke .4s ease, stroke-width .3s ease; }
                .l-seg { transition: opacity .45s ease; }
                .l-flow { stroke-dasharray: 7 6; animation: lflow .6s linear infinite; }
                @keyframes lflow { to { stroke-dashoffset: -26; } }
            `}</style>

            {stack(LEFT_X, 'send', 'your laptop')}
            {stack(RIGHT_X, 'recv', 'web server')}

            {/* the wire */}
            <line x1={LEFT_X + STACK_W} y1={WIRE_Y} x2={RIGHT_X} y2={WIRE_Y}
                stroke={onWire ? '#f472b6' : '#334155'} strokeWidth="2.5" className={onWire ? 'l-flow' : ''} />
            {onWire && (
                <text x={380} y={WIRE_Y + 34} textAnchor="middle" fontSize="9" fill="#f9a8d4" fontFamily="monospace">
                    {step.bitsText}
                </text>
            )}

            {/* the PDU */}
            <g style={{ transform: `translate(${px}px, ${py}px)`, transition: 'transform .75s cubic-bezier(.45,0,.15,1)' }}>
                {SEGS.map(s => {
                    const on = present.has(s.id);
                    const fresh = step.fresh === s.id;
                    return (
                        <g key={s.id} className="l-seg" style={{ opacity: on ? 1 : 0 }}>
                            <rect x={SEG_X[s.id]} y={0} width={s.w} height={PDU_H} rx="3"
                                fill={s.fill} stroke={fresh ? '#ffffff' : s.stroke} strokeWidth={fresh ? 2 : 1.2} />
                            <text x={SEG_X[s.id] + s.w / 2} y={PDU_H / 2 + 4} textAnchor="middle" fontSize="9.5"
                                fontWeight="700" fill={s.text} fontFamily="monospace">{s.label}</text>
                        </g>
                    );
                })}
                {step.layer && step.side !== 'wire' && (
                    <text x={SEG_X.data + SEGS[3].w / 2} y={PDU_H + 13}
                        textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="monospace">
                        {PDU_NAME[step.layer]} · {PDU_SIZE[step.layer]} bytes
                    </text>
                )}
            </g>

            {step.caption && (
                <text x="380" y="408" textAnchor="middle" fontSize="10.5" fill="#64748b" fontFamily="monospace">{step.caption}</text>
            )}
        </svg>
    );
}

// ── Header inspector (below the stage) ────────────────────────────────────────
const INSPECT = {
    http: {
        title: 'Application — the HTTP request, as the browser wrote it',
        tone: 'text-pink-300', rows: [
            ['request line', 'GET /index.html HTTP/1.1'],
            ['header', 'Host: example.com'],
            ['length', `${DATA_LEN} bytes, blank line included`],
        ],
    },
    tcp: {
        title: `Transport — TCP header, ${TCP_LEN} bytes`,
        tone: 'text-sky-300', rows: [
            ['source port', '51820  (picked by the OS)'],
            ['dest port', '80  (who should get this)'],
            ['sequence no.', '1001  (byte offset in the stream)'],
            ['ack no.', '5001  (next byte expected back)'],
            ['flags · window', 'PSH ACK · 64240'],
        ],
    },
    ip: {
        title: `Internet — IPv4 header, ${IP_LEN} bytes`,
        tone: 'text-violet-300', rows: [
            ['source IP', IP.laptop],
            ['dest IP', IP.server],
            ['protocol', '6  (TCP is inside)'],
            ['TTL', '64'],
            ['total length', `${PACKET_LEN}`],
        ],
    },
    eth: {
        title: `Link — Ethernet header ${ETH_LEN} bytes + ${FCS_LEN}-byte trailer`,
        tone: 'text-amber-300', rows: [
            ['dest MAC', `${MAC.gateway}  (the gateway, not the server)`],
            ['source MAC', MAC.laptop],
            ['EtherType', '0x0800  (IPv4 is inside)'],
            ['FCS (trailer)', 'CRC-32 over the whole frame'],
        ],
    },
    ethIn: {
        title: 'Receiver link layer — checks, then strips',
        tone: 'text-amber-300', rows: [
            ['dest MAC', `${MAC.server}  → mine, keep it`],
            ['source MAC', `${MAC.lastHop}  (the last router, not your laptop)`],
            ['FCS', 'CRC-32 recomputed → matches, frame intact'],
            ['EtherType', '0x0800 → hand the payload to IPv4'],
        ],
    },
    ipIn: {
        title: 'Receiver internet layer — checks, then strips',
        tone: 'text-violet-300', rows: [
            ['dest IP', `${IP.server}  → mine, deliver locally`],
            ['source IP', `${IP.laptop}  (unchanged end to end, NAT aside)`],
            ['TTL', `${64 - HOPS}  (${HOPS} routers each took one)`],
            ['protocol', '6 → hand the payload to TCP'],
        ],
    },
    tcpIn: {
        title: 'Receiver transport layer — checks, then strips',
        tone: 'text-sky-300', rows: [
            ['dest port', '80 → the socket nginx is listening on'],
            ['sequence no.', '1001 → exactly the next byte expected, in order'],
            ['checksum', 'matches → bytes appended to the receive buffer'],
            ['reply', 'an ACK for 1001 + 47 = 1048 goes back'],
        ],
    },
    httpIn: {
        title: 'Receiver application — what nginx reads from the socket',
        tone: 'text-pink-300', rows: [
            ['bytes read', `${DATA_LEN} — identical to what the browser wrote`],
            ['headers seen', 'none of TCP, IP or Ethernet — all stripped below'],
        ],
    },
};

function Inspector({ id }) {
    if (id === 'bytes') {
        const parts = [
            { k: 'preamble', n: PREAMBLE, c: 'bg-slate-600' },
            { k: 'dst MAC', n: 6, c: 'bg-amber-600' },
            { k: 'src MAC', n: 6, c: 'bg-amber-600' },
            { k: 'type', n: 2, c: 'bg-amber-500' },
            { k: 'IP', n: IP_LEN, c: 'bg-violet-600' },
            { k: 'TCP', n: TCP_LEN, c: 'bg-sky-600' },
            { k: 'HTTP data', n: DATA_LEN, c: 'bg-pink-600' },
            { k: 'FCS', n: FCS_LEN, c: 'bg-amber-600' },
            { k: 'gap', n: IFG, c: 'bg-slate-800' },
        ];
        const total = parts.reduce((a, p) => a + p.n, 0);
        return (
            <div className="font-mono">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2">
                    what actually crosses the wire — {total} byte-times for {DATA_LEN} bytes of request
                </div>
                <div className="flex h-7 rounded overflow-hidden border border-slate-700">
                    {parts.map(p => (
                        <div key={p.k} className={`${p.c} flex items-center justify-center text-[9px] text-white/90 border-r border-slate-950/40`}
                            style={{ width: `${(p.n / total) * 100}%` }} title={`${p.k}: ${p.n} B`}>
                            {p.n >= 6 ? p.n : ''}
                        </div>
                    ))}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[10px] text-slate-500">
                    {parts.map(p => <span key={p.k}><span className={`inline-block w-2 h-2 rounded-sm mr-1 ${p.c}`} />{p.k} {p.n} B</span>)}
                </div>
            </div>
        );
    }
    const spec = INSPECT[id];
    if (!spec) return null;
    return (
        <div className="font-mono">
            <div className={`text-[10px] uppercase tracking-widest font-semibold mb-2 ${spec.tone}`}>{spec.title}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                {spec.rows.map(([k, v]) => (
                    <div key={k} className="flex gap-3 text-[11px]">
                        <span className="text-slate-500 w-28 shrink-0">{k}</span>
                        <span className="text-slate-200 break-words min-w-0">{v}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Act 1: two models ─────────────────────────────────────────────────────────
const OSI = [
    { n: 7, name: 'Application',  eg: 'HTTP, DNS, SMTP',     tcpip: 0 },
    { n: 6, name: 'Presentation', eg: 'encoding, TLS*',      tcpip: 0 },
    { n: 5, name: 'Session',      eg: 'sessions, RPC',       tcpip: 0 },
    { n: 4, name: 'Transport',    eg: 'TCP, UDP, QUIC*',     tcpip: 1 },
    { n: 3, name: 'Network',      eg: 'IP, ICMP',            tcpip: 2 },
    { n: 2, name: 'Data Link',    eg: 'Ethernet, Wi-Fi, ARP', tcpip: 3 },
    { n: 1, name: 'Physical',     eg: 'copper, fibre, radio', tcpip: 3 },
];
const TCPIP = [
    { name: 'Application', span: [7, 5], color: 'border-pink-500/60 bg-pink-500/10 text-pink-200' },
    { name: 'Transport',   span: [4, 4], color: 'border-sky-500/60 bg-sky-500/10 text-sky-200' },
    { name: 'Internet',    span: [3, 3], color: 'border-violet-500/60 bg-violet-500/10 text-violet-200' },
    { name: 'Link',        span: [2, 1], color: 'border-amber-500/60 bg-amber-500/10 text-amber-200' },
];

function ModelsScene({ level }) {
    const ROW = 40;
    return (
        <div className="w-full py-2 font-mono">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-3">
                OSI: seven layers to talk about · TCP/IP: four layers that actually run
            </div>
            <div className="flex gap-3">
                <div className="flex-1 space-y-1">
                    {OSI.map((l, i) => (
                        <div key={l.n} className="flex items-center gap-2 rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 transition-opacity duration-500"
                            style={{ height: ROW - 4, opacity: level >= 1 ? 1 : 0.1, transitionDelay: `${i * 60}ms` }}>
                            <span className="text-slate-500 text-[10px] w-4">L{l.n}</span>
                            <span className="text-slate-200 text-xs flex-1">{l.name}</span>
                            <span className={`text-[10px] text-slate-500 transition-opacity duration-500 ${level >= 3 ? 'opacity-100' : 'opacity-0'}`}>{l.eg}</span>
                        </div>
                    ))}
                </div>
                <div className={`w-40 sm:w-48 shrink-0 space-y-1 transition-opacity duration-500 ${level >= 2 ? 'opacity-100' : 'opacity-0'}`}>
                    {TCPIP.map(t => {
                        const rows = t.span[0] - t.span[1] + 1;
                        return (
                            <div key={t.name} className={`rounded-lg border flex items-center justify-center text-xs font-semibold ${t.color}`}
                                style={{ height: rows * ROW - 4 }}>
                                {t.name}
                            </div>
                        );
                    })}
                </div>
            </div>
            <p className={`text-[11px] text-slate-500 mt-4 leading-relaxed transition-opacity duration-500 ${level >= 3 ? 'opacity-100' : 'opacity-0'}`}>
                Engineers still say &quot;layer 2 switch&quot; and &quot;layer 7 load balancer&quot; — OSI numbers are the shared vocabulary.
                But the internet runs the TCP/IP suite, which folds OSI&apos;s top three layers into the application and its bottom
                two into the link. The starred entries show why: TLS and QUIC do not sit cleanly in any one OSI box.
            </p>
        </div>
    );
}

// ── Act 4: the boxes in between ───────────────────────────────────────────────
const DEVICES = [
    { id: 'laptop', name: 'laptop', reads: 4, note: 'all four layers' },
    { id: 'switch', name: 'switch', reads: 1, note: 'reads dest MAC only' },
    { id: 'router', name: 'router', reads: 2, note: 'reads IP, rewrites Ethernet' },
    { id: 'server', name: 'server', reads: 4, note: 'all four layers' },
];
const DEV_LAYER = ['Link', 'Internet', 'Transport', 'Application'];
const DEV_COLOR = ['#fbbf24', '#a78bfa', '#38bdf8', '#ec4899'];

function DevicesScene({ hot }) {
    const COL_W = 150, BOX_W = 116, BOX_H = 30, BASE = 260;
    const x0 = i => 40 + i * (COL_W + 30);
    /* The frame climbs exactly as high as each device reads, then drops back
       down to the wire — the path is the whole idea of this act. */
    const pts = [];
    DEVICES.forEach((d, i) => {
        const cx = x0(i) + BOX_W / 2;
        const top = BASE - d.reads * (BOX_H + 6) + BOX_H / 2;
        if (i === 0) pts.push([cx - 18, top], [cx - 18, BASE + 34], [cx + 18, BASE + 34]);
        else if (i === DEVICES.length - 1) pts.push([cx - 18, BASE + 34], [cx - 18, top]);
        else pts.push([cx - 18, BASE + 34], [cx - 18, top], [cx + 18, top], [cx + 18, BASE + 34]);
    });
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ');
    return (
        <svg viewBox="0 0 760 360" width="100%" className="max-h-[400px] select-none">
            <style>{`.d-box { transition: fill .4s ease, stroke .4s ease; } .d-flow { stroke-dasharray: 7 6; animation: dflow .6s linear infinite; } @keyframes dflow { to { stroke-dashoffset: -26; } }`}</style>
            <line x1={20} y1={BASE + 34} x2={740} y2={BASE + 34} stroke="#334155" strokeWidth="2" />
            <text x={380} y={BASE + 56} textAnchor="middle" fontSize="9" fill="#475569" fontFamily="monospace">physical links — bits on copper, fibre and radio</text>
            <path d={d} fill="none" stroke="#f472b6" strokeWidth="2" className="d-flow" opacity="0.85" />
            {DEVICES.map((dev, i) => {
                const on = hot === dev.id;
                return (
                    <g key={dev.id}>
                        <text x={x0(i) + BOX_W / 2} y={36} textAnchor="middle" fontSize="11" fontWeight="600"
                            fill={on ? '#f9a8d4' : '#cbd5e1'}>{dev.name}</text>
                        <text x={x0(i) + BOX_W / 2} y={52} textAnchor="middle" fontSize="8.5" fill="#64748b" fontFamily="monospace">{dev.note}</text>
                        {Array.from({ length: dev.reads }).map((_, k) => (
                            <g key={k}>
                                <rect x={x0(i)} y={BASE - (k + 1) * (BOX_H + 6) + 6} width={BOX_W} height={BOX_H} rx="6" className="d-box"
                                    fill={on ? '#1e1b2e' : '#0f172a'} stroke={on ? DEV_COLOR[k] : '#334155'} strokeWidth={on ? 2 : 1.1} />
                                <text x={x0(i) + BOX_W / 2} y={BASE - (k + 1) * (BOX_H + 6) + 6 + 19} textAnchor="middle" fontSize="9.5"
                                    fill={on ? DEV_COLOR[k] : '#64748b'} fontFamily="monospace">{DEV_LAYER[k]}</text>
                            </g>
                        ))}
                    </g>
                );
            })}
        </svg>
    );
}

// ── Act 6: demultiplexing ─────────────────────────────────────────────────────
const DEMUX = [
    { field: 'EtherType', options: [['0x0800', 'IPv4'], ['0x86DD', 'IPv6'], ['0x0806', 'ARP']], pick: 0, tone: 'amber' },
    { field: 'IP protocol', options: [['6', 'TCP'], ['17', 'UDP'], ['1', 'ICMP']], pick: 0, tone: 'violet' },
    { field: 'TCP dest port', options: [['80', 'nginx'], ['443', 'nginx (TLS)'], ['22', 'sshd']], pick: 0, tone: 'sky' },
];
const DEMUX_TONE = {
    amber:  'border-amber-500/70 bg-amber-500/15 text-amber-200',
    violet: 'border-violet-500/70 bg-violet-500/15 text-violet-200',
    sky:    'border-sky-500/70 bg-sky-500/15 text-sky-200',
};

function DemuxScene({ level }) {
    return (
        <div className="w-full py-2 font-mono">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-4">
                every header names the layer above it — that is how a host knows where bytes go
            </div>
            <div className="space-y-4">
                {DEMUX.map((row, i) => (
                    <div key={row.field} className="transition-opacity duration-500" style={{ opacity: i < level ? 1 : 0.12, transitionDelay: `${i * 80}ms` }}>
                        <div className="text-[11px] text-slate-400 mb-1.5">{row.field}</div>
                        <div className="grid grid-cols-3 gap-2">
                            {row.options.map(([v, to], k) => {
                                const on = i < level && k === row.pick;
                                return (
                                    <div key={v} className={`rounded-lg border px-3 py-2 text-xs transition-colors duration-500 ${on ? DEMUX_TONE[row.tone] : 'border-slate-800 bg-slate-900/50 text-slate-600'}`}>
                                        <span className="font-semibold">{v}</span> <span className="opacity-70">→ {to}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
            <p className={`text-[11px] text-slate-500 mt-5 leading-relaxed transition-opacity duration-500 ${level >= 3 ? 'opacity-100' : 'opacity-0'}`}>
                Ethernet does not know what IP is, and IP does not know what HTTP is. Each layer reads one field to pick the next
                handler, and the final hop — the 4-tuple of source IP, source port, dest IP and dest port — picks the exact socket,
                which is how one server keeps thousands of connections on port 80 apart.
            </p>
        </div>
    );
}

// ── Act 7: overhead ───────────────────────────────────────────────────────────
function OverheadScene({ level }) {
    return (
        <div className="w-full py-2 font-mono">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-3">
                share of wire time that is your data (TCP + IP + Ethernet + preamble and gap)
            </div>
            <div className="space-y-2.5">
                {OVERHEAD_ROWS.map((r, i) => (
                    <div key={r.payload} className="transition-opacity duration-500" style={{ opacity: level >= 1 ? 1 : 0.1, transitionDelay: `${i * 70}ms` }}>
                        <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-slate-300">{r.payload} B <span className="text-slate-500">— {r.what}</span></span>
                            <span className={`transition-opacity duration-500 ${level >= 2 ? 'opacity-100' : 'opacity-0'} ${r.eff > 0.8 ? 'text-green-300' : r.eff > 0.3 ? 'text-yellow-300' : 'text-red-300'}`}>
                                {(r.eff * 100).toFixed(1)}%
                            </span>
                        </div>
                        <div className="h-4 bg-slate-800 rounded overflow-hidden flex">
                            <div className="h-full bg-pink-500 transition-all duration-700" style={{ width: level >= 2 ? `${r.eff * 100}%` : '0%' }} />
                        </div>
                        <div className="text-[10px] text-slate-600 mt-0.5">
                            frame {r.frame} B{r.padded ? ` (incl. ${r.padded} B padding)` : ''} · {r.wire} byte-times on the wire
                        </div>
                    </div>
                ))}
            </div>
            <div className={`mt-4 rounded-xl border border-slate-700/60 bg-slate-900/50 p-3 text-[11px] text-slate-400 leading-relaxed transition-opacity duration-500 ${level >= 3 ? 'opacity-100' : 'opacity-0'}`}>
                Ethernet carries at most 1500 bytes of payload (the MTU). Take away 20 for IP and 20 for TCP and one segment
                holds at most <span className="text-pink-300">1460 bytes</span> — the MSS each side announces in its SYN. Anything bigger is
                cut into several segments by TCP, so IP rarely has to fragment.
            </div>
        </div>
    );
}

// ── Recap ─────────────────────────────────────────────────────────────────────
function RecapCards({ wins }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
            {wins.map((w, i) => (
                <div key={i} className="px-3 py-2.5 rounded-xl border border-pink-500/30 bg-slate-900/50">
                    <div className="text-xs font-semibold text-pink-200">{w.t}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{w.d}</div>
                </div>
            ))}
        </div>
    );
}

// ── Step generation ───────────────────────────────────────────────────────────
const BITS = '10101010 10101011 11011110 10101101 10111110 11101111 00000000 00000001 …';

function generateSteps() {
    const steps = [];
    const s = (act, actName, data, explanation) => steps.push({ act, actName, ...data, explanation });

    // ═══ ACT 1 ═══
    s(1, 'Two Models', { models: 1 },
        'Getting bytes from a browser to a server means solving several unrelated problems at once: encoding the request, splitting it into pieces and recovering losses, finding a route across many networks, and putting signals on a cable. Layering gives each problem its own owner. The OSI model names seven layers, numbered from the cable up.');
    s(1, 'Two Models', { models: 2 },
        'The TCP/IP model — the one the internet actually runs — has four. Its application layer covers OSI 5 to 7, because in practice the program itself handles sessions and encodings. Its link layer covers OSI 1 and 2, because a network card does both. Transport (OSI 4) and Internet (OSI 3) map one to one.');
    s(1, 'Two Models', { models: 3 },
        'Each layer talks only to the layer directly above and below it on the same machine, and logically to the same layer on the other machine. TCP on your laptop speaks TCP to TCP on the server, but it never touches the cable: it hands a segment down to IP and trusts the layers below to deliver it.');

    // ═══ ACT 2 ═══
    s(2, 'Down the Stack', { side: 'send', layer: 'app', pdu: ['data'], fresh: 'data', inspect: 'http',
        caption: `the application hands ${DATA_LEN} bytes to a TCP socket` },
        `The browser writes a ${DATA_LEN}-byte HTTP request into a socket. At this layer it is just a message: the browser does not know or care how many routers sit between it and the server, or what kind of cable is involved.`);
    s(2, 'Down the Stack', { side: 'send', layer: 'transport', pdu: ['tcp', 'data'], fresh: 'tcp', inspect: 'tcp',
        caption: `+ ${TCP_LEN}-byte TCP header → a segment of ${SEGMENT_LEN} bytes` },
        `TCP prepends a ${TCP_LEN}-byte header and the message becomes a segment. The ports say which program on each end owns this conversation; the sequence number says where these bytes sit in the stream, so the receiver can reorder and detect gaps. Nothing here says which machine to go to — that is not TCP's job.`);
    s(2, 'Down the Stack', { side: 'send', layer: 'internet', pdu: ['ip', 'tcp', 'data'], fresh: 'ip', inspect: 'ip',
        caption: `+ ${IP_LEN}-byte IP header → a packet of ${PACKET_LEN} bytes` },
        `IP prepends its own ${IP_LEN}-byte header and the segment becomes a packet. Now there are machine addresses: source and destination IP, which survive end to end. The protocol field records that TCP is inside, and TTL starts at 64 so a packet caught in a routing loop eventually dies.`);
    s(2, 'Down the Stack', { side: 'send', layer: 'link', pdu: ['eth', 'ip', 'tcp', 'data', 'fcs'], fresh: 'eth', inspect: 'eth',
        caption: `+ ${ETH_LEN}-byte Ethernet header and ${FCS_LEN}-byte FCS → a frame of ${FRAME_LEN} bytes` },
        `Ethernet wraps the packet in a ${ETH_LEN}-byte header and a ${FCS_LEN}-byte trailer. Its addresses are MAC addresses, and they only mean anything on this one link — which is why the destination MAC is the home router's, not the server's. The trailer is a CRC over the whole frame so the next box can detect corruption. Note the nesting: every header added so far is now just payload to the layer below.`);

    // ═══ ACT 3 ═══
    s(3, 'On the Wire', { side: 'wire', layer: 'near', pdu: ['eth', 'ip', 'tcp', 'data', 'fcs'], inspect: 'bytes', bitsText: BITS,
        caption: 'the NIC adds a preamble, then clocks the frame out one bit at a time' },
        `The network card turns the frame into a signal. It sends an ${PREAMBLE}-byte preamble first so the receiver's clock can lock on, then the ${FRAME_LEN} bytes of frame, then stays silent for a ${IFG}-byte gap. The physical layer has no idea there are headers in there at all — to it, this is a run of bits.`);
    s(3, 'On the Wire', { side: 'wire', layer: 'mid', pdu: ['eth', 'ip', 'tcp', 'data', 'fcs'], inspect: 'bytes', bitsText: BITS,
        caption: `${PREAMBLE + FRAME_LEN + IFG} byte-times on the wire to carry ${DATA_LEN} bytes of request` },
        `Count the cost: ${PREAMBLE + FRAME_LEN + IFG} byte-times of wire for ${DATA_LEN} bytes of request, so only ${Math.round((DATA_LEN / (PREAMBLE + FRAME_LEN + IFG)) * 100)}% of the line is spent on what the browser actually asked for. For small messages the headers dominate; act 7 shows how that changes as the payload grows.`);

    // ═══ ACT 4 ═══
    s(4, 'In Between', { devices: 'switch' },
        'Between the two hosts sit boxes that only read as far up the stack as they need to. A switch is a link-layer device: it reads the destination MAC, looks it up in its MAC table and sends the frame out one port. It never opens the IP packet, which is why it does not care whether the payload is IPv4, IPv6 or something else.');
    s(4, 'In Between', { devices: 'router' },
        'A router reads one layer higher. It strips the Ethernet header, looks up the destination IP in its routing table, decrements TTL, and builds a brand-new Ethernet header for the next link — new source and destination MAC. The IP addresses inside stay as they are. Every router on the way repeats this; Under the Hood\'s packet-routing explainer follows one packet through all of them.');
    s(4, 'In Between', { devices: 'server' },
        `${HOPS} routers later the frame reaches the server's network card. Its IP header is the one your laptop wrote, apart from a TTL worn down to ${64 - HOPS}; its Ethernet header is the last router's work, not your laptop's. Now the stack runs in reverse.`);

    // ═══ ACT 5 ═══
    s(5, 'Up the Stack', { side: 'recv', layer: 'link', pdu: ['eth', 'ip', 'tcp', 'data', 'fcs'], inspect: 'ethIn',
        caption: 'Ethernet: is it for me, and did it arrive intact?' },
        'The receiving link layer asks two questions: is the destination MAC mine (or broadcast), and does the CRC in the FCS match? A frame failing either is silently dropped — Ethernet never asks for a resend; that is left to TCP. This one passes, so the Ethernet header and trailer are stripped and the EtherType, 0x0800, says to hand what is left to IPv4.');
    s(5, 'Up the Stack', { side: 'recv', layer: 'internet', pdu: ['ip', 'tcp', 'data'], inspect: 'ipIn',
        caption: 'IP: is this address mine? who is inside?' },
        'IP checks that the destination address is one of this host\'s own, verifies the header checksum, and reads the protocol field: 6, so the payload goes to TCP. The IP header is stripped. Had the address not been local, a router would forward it instead; a host simply drops it.');
    s(5, 'Up the Stack', { side: 'recv', layer: 'transport', pdu: ['tcp', 'data'], inspect: 'tcpIn',
        caption: 'TCP: which socket? is it the next byte in order?' },
        `TCP uses the destination port — together with both IP addresses and the source port — to find the exact connection, then checks the sequence number. 1001 is exactly the next byte it expected, so the ${DATA_LEN} bytes join the socket's receive buffer and an acknowledgement for 1048 is queued to go back. Had a segment been missing, these bytes would wait in the buffer until it arrived.`);
    s(5, 'Up the Stack', { side: 'recv', layer: 'app', pdu: ['data'], inspect: 'httpIn',
        caption: 'nginx reads exactly the bytes the browser wrote' },
        `nginx reads ${DATA_LEN} bytes from its socket — byte for byte what the browser wrote, with no trace of TCP, IP or Ethernet. That is the payoff of layering: each layer was free to change its own header in transit (every router rewrote Ethernet) without anything above it noticing.`);

    // ═══ ACT 6 ═══
    s(6, 'Demultiplexing', { demux: 1 },
        'One question was skipped on the way up: how does each layer know who to hand its payload to? Ethernet does not understand IP. It just reads the EtherType field — 0x0800 means IPv4, 0x86DD IPv6, 0x0806 ARP — and passes the payload to whichever handler owns that value.');
    s(6, 'Demultiplexing', { demux: 2 },
        'IP does the same with its protocol field: 6 is TCP, 17 is UDP, 1 is ICMP. This is why ping (ICMP) works on a machine with no web server running — it never reaches the transport layer at all.');
    s(6, 'Demultiplexing', { demux: 3 },
        'TCP finishes the job with ports. Strictly, a connection is identified by the 4-tuple (source IP, source port, destination IP, destination port), so thousands of browsers can all talk to port 80 at once and still land in separate sockets. Going down the stack is encapsulation; going up and choosing the next handler at every layer is demultiplexing.');

    // ═══ ACT 7 ═══
    s(7, 'Overhead', { overhead: 1 },
        'Every frame pays the same fixed tax whatever it carries: 20 bytes of TCP, 20 of IP, 18 of Ethernet header and trailer, plus 20 byte-times of preamble and gap. And Ethernet has a 64-byte minimum frame, so tiny payloads are padded up to it.');
    s(7, 'Overhead', { overhead: 2 },
        `The effect is dramatic at the small end. A single keystroke over SSH spends ${(OVERHEAD_ROWS[0].eff * 100).toFixed(1)}% of its wire time on data. Our request manages ${(OVERHEAD_ROWS[1].eff * 100).toFixed(1)}%, and a full-size segment reaches ${(OVERHEAD_ROWS[3].eff * 100).toFixed(1)}%. This is why protocols batch small writes — Nagle's algorithm in TCP exists for exactly this.`);
    s(7, 'Overhead', { overhead: 3 },
        'The ceiling is the MTU: an Ethernet frame carries at most 1500 bytes of payload. Subtract the IP and TCP headers and one segment holds at most 1460 bytes, the maximum segment size each side announces in its SYN. TCP cuts anything larger into MSS-sized segments, so IP almost never has to fragment.');

    // ═══ ACT 8 ═══
    s(8, 'Recap', {
        recap: true,
        wins: [
            { t: 'One header per layer', d: `HTTP data (${DATA_LEN} B) → TCP segment (${SEGMENT_LEN} B) → IP packet (${PACKET_LEN} B) → Ethernet frame (${FRAME_LEN} B). Each header is payload to the layer below.` },
            { t: 'Scope differs by layer', d: 'Ports name programs, IP addresses name machines end to end, MAC addresses name the next box on this one link only.' },
            { t: 'Boxes read only what they need', d: 'A switch reads the Ethernet header; a router reads IP and rewrites Ethernet; only the hosts read TCP and above.' },
            { t: 'Up the stack is demultiplexing', d: 'EtherType picks IP, the protocol field picks TCP, the port picks the socket. No layer understands the one above.' },
        ],
    }, 'Seven OSI layers for the vocabulary, four TCP/IP layers in practice. On the way down every layer wraps what it was given in its own header; on the way up every layer checks its header, strips it, and uses one field to choose the next handler. Every other page in this section lives inside one of these boxes — the handshake and windows in Transport, routing in Internet, ARP and switching in Link.');

    return steps;
}

function VisualizationPanel({ step }) {
    if (!step) return null;
    if (step.recap)    return <RecapCards wins={step.wins} />;
    if (step.models)   return <ModelsScene level={step.models} />;
    if (step.devices)  return <DevicesScene hot={step.devices} />;
    if (step.demux)    return <DemuxScene level={step.demux} />;
    if (step.overhead) return <OverheadScene level={step.overhead} />;
    return <StackStage step={step} />;
}

// ── Quiz ──────────────────────────────────────────────────────────────────────
const quizQuestions = [
    {
        question: 'A switch receives a frame. Which header field does it use to decide where the frame goes?',
        options: [
            'The destination IP address',
            'The destination MAC address in the Ethernet header',
            'The TCP destination port',
            'The TTL',
        ],
        correct: 1,
        explanation: 'A switch is a link-layer device. It looks the destination MAC up in its MAC table and forwards out one port (or floods if unknown). It never opens the IP packet — reading IP and rewriting the Ethernet header is what a router does.',
    },
    {
        question: 'A TCP segment carries 47 bytes of data with no options. How big is the Ethernet frame that carries it?',
        options: ['67 bytes', '87 bytes', '101 bytes', '105 bytes'],
        correct: 3,
        explanation: '47 B of data + 20 B TCP header = 67 B segment; + 20 B IP header = 87 B packet; + 14 B Ethernet header + 4 B FCS trailer = 105 B frame. The 8-byte preamble and 12-byte gap are on the wire too, but they are not part of the frame.',
    },
    {
        question: 'On the receiving host, how does the IP layer know whether to hand its payload to TCP or to UDP?',
        options: [
            'By the destination port number',
            'By the EtherType field',
            'By the protocol field in the IP header (6 = TCP, 17 = UDP)',
            'It tries TCP first and falls back to UDP',
        ],
        correct: 2,
        explanation: 'Each header names the layer above it. EtherType tells Ethernet that IP is inside; the IP protocol field tells IP that TCP (6) or UDP (17) is inside; ports then pick the socket. Ports belong to the transport header, which IP never parses.',
    },
];

function QuizPanel({ quizState, setQuizState }) {
    const q = quizQuestions[quizState.current];
    if (quizState.complete) {
        return (
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-5 text-center">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{quizQuestions.length}</div>
                <div className="text-pink-300/80 text-sm mb-4">
                    {quizState.score === quizQuestions.length ? 'Perfect — you can peel a frame by hand.' : 'Step through acts 2 and 5 again, then retry.'}
                </div>
                <button onClick={() => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false })}
                    className="px-4 py-2 bg-pink-500 hover:bg-pink-600 rounded-lg text-sm text-white transition-colors">Retake Quiz</button>
            </div>
        );
    }
    return (
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-pink-400/80 mb-2">Question {quizState.current + 1} / {quizQuestions.length}</div>
            <p className="text-slate-200 text-sm font-medium mb-3 leading-relaxed">{q.question}</p>
            <div className="space-y-2">
                {q.options.map((opt, i) => {
                    let cls = 'border-slate-700 text-slate-400 hover:border-pink-500 hover:text-slate-200';
                    if (quizState.answered) {
                        if (i === q.correct) cls = 'border-green-500 bg-green-500/10 text-green-300';
                        else if (i === quizState.selected) cls = 'border-red-500 bg-red-500/10 text-red-300';
                        else cls = 'border-slate-800 text-slate-500';
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
            {quizState.answered && <div className="mt-3 text-xs text-slate-400 bg-slate-800/50 rounded-lg p-2 leading-relaxed">{q.explanation}</div>}
            {quizState.answered && (
                <button onClick={() => {
                    if (quizState.current + 1 >= quizQuestions.length) setQuizState(st => ({ ...st, complete: true }));
                    else setQuizState(st => ({ ...st, current: st.current + 1, selected: null, answered: false }));
                }} className="mt-3 w-full py-2 bg-pink-500 hover:bg-pink-600 rounded-lg text-xs text-white transition-colors">
                    {quizState.current + 1 >= quizQuestions.length ? 'See Score' : 'Next Question'}
                </button>
            )}
        </div>
    );
}

const codeExample = `import struct

def tcp_header(src_port, dst_port, seq, ack):
    offset_flags = (5 << 12) | 0x018          # 5 words, PSH + ACK
    return struct.pack('!HHIIHHHH', src_port, dst_port, seq, ack,
                       offset_flags, 64240, 0, 0)  # checksum left 0 here

def ip_header(src, dst, payload_len, ttl=64, proto=6):
    ver_ihl = (4 << 4) | 5                     # IPv4, 5 words
    total = 20 + payload_len
    return struct.pack('!BBHHHBBH4s4s', ver_ihl, 0, total, 0, 0,
                       ttl, proto, 0, bytes(src), bytes(dst))

def eth_header(dst_mac, src_mac, ethertype=0x0800):
    return struct.pack('!6s6sH', dst_mac, src_mac, ethertype)

data = b'GET /index.html HTTP/1.1\\r\\nHost: example.com\\r\\n\\r\\n'
segment = tcp_header(51820, 80, 1001, 5001) + data
packet = ip_header([192, 168, 1, 42], [93, 184, 216, 34], len(segment)) + segment
frame = eth_header(bytes(6), bytes(6)) + packet   # NIC appends the 4-byte FCS

print(len(data), len(segment), len(packet), len(frame) + 4)
# 47 67 87 105`;

// ── Page ──────────────────────────────────────────────────────────────────────
const STEPS = generateSteps();

const REF_ROWS = [
    { layer: 'app',       label: 'Application', pdu: 'message', addr: 'URL / host', size: `${DATA_LEN} B here` },
    { layer: 'transport', label: 'Transport',   pdu: 'segment', addr: 'port',       size: '20 B header' },
    { layer: 'internet',  label: 'Internet',    pdu: 'packet',  addr: 'IP address', size: '20 B header' },
    { layer: 'link',      label: 'Link',        pdu: 'frame',   addr: 'MAC address', size: '14 B + 4 B' },
];

export default function OsiLayersPage() {
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying,   setIsPlaying]   = useState(false);
    const [speed,       setSpeed]       = useState(1500);
    const [showCode,    setShowCode]    = useState(false);
    const [quizState,   setQuizState]   = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    useEffect(() => {
        if (!isPlaying) return;
        if (currentStep >= STEPS.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, speed]);

    const step = STEPS[currentStep];
    const pct = Math.round(((currentStep + 1) / STEPS.length) * 100);
    const activeLayer = step?.side && step.side !== 'wire' ? step.layer : null;

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* Header */}
            <div className="bg-gradient-to-r from-pink-500 to-rose-600 px-4 py-6">
                <div className="max-w-7xl mx-auto">
                    <Link href="/computer-networks" className="flex items-center gap-1.5 text-pink-100 hover:text-white text-sm mb-4 w-fit transition-colors">
                        <ArrowLeft className="h-4 w-4" />Back to Computer Networks
                    </Link>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">OSI and TCP/IP Layers</h1>
                            <p className="text-pink-100 text-sm mt-1">
                                One HTTP request gains a header per layer going down, crosses the wire as bits, and is unwrapped going up
                            </p>
                        </div>
                        <div className="text-right shrink-0">
                            <div className="text-xs text-pink-100 font-mono">{currentStep + 1} / {STEPS.length}</div>
                            <div className="text-[10px] text-pink-200/70 mt-0.5">steps</div>
                        </div>
                    </div>

                    {/* Act timeline */}
                    <div className="flex flex-wrap gap-1.5 mt-4">
                        {ACTS.map(act => {
                            const ActIcon = act.icon;
                            const isCurrent = step?.act === act.id;
                            const isDone = step?.act > act.id;
                            return (
                                <button key={act.id} onClick={() => {
                                    const first = STEPS.findIndex(s => s.act === act.id);
                                    if (first >= 0) { setCurrentStep(first); setIsPlaying(false); }
                                }}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                        isCurrent ? 'bg-white/20 text-white border border-white/30'
                                        : isDone ? 'bg-white/5 text-pink-100/80 border border-white/10'
                                        : 'bg-transparent text-pink-950/60 border border-transparent hover:border-white/10 hover:text-pink-100'
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
                <div className="h-full bg-gradient-to-r from-pink-500 to-rose-400 transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>

            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Visualization */}
                    <div className="lg:col-span-2">
                        <div className="bg-slate-900/70 border border-slate-700/50 rounded-2xl overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800/60">
                                <div>
                                    <span className="text-xs font-semibold text-pink-400 uppercase tracking-widest">Act {step?.act} of {ACTS.length}</span>
                                    <span className="text-slate-600 mx-2">·</span>
                                    <span className="text-sm font-semibold text-slate-200">{step?.actName}</span>
                                </div>
                                <span className="text-[10px] text-slate-600 font-mono">step {currentStep + 1}</span>
                            </div>
                            <div className="px-5 py-3 min-h-[440px] flex items-center">
                                <VisualizationPanel step={step} />
                            </div>
                            {/* Always mounted so the panel height does not jump between acts */}
                            <div className="px-5 py-4 border-t border-slate-800/60 bg-slate-950/40 min-h-[132px]">
                                {step?.inspect ? <Inspector id={step.inspect} /> : (
                                    <p className="text-[11px] text-slate-600 font-mono">
                                        Header inspector — fills in while the request moves through a stack (acts 2, 3 and 5).
                                    </p>
                                )}
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
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-pink-500 hover:bg-pink-600 text-white transition-colors text-sm font-medium">
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
                                    onChange={e => setSpeed(Number(e.target.value))} className="w-24 accent-pink-500" />
                                <span className="text-xs text-slate-600 font-mono w-14">{speed > 1500 ? 'slow' : speed < 500 ? 'fast' : 'normal'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        <div className="bg-pink-500/10 border border-pink-500/20 rounded-xl p-4">
                            <div className="flex items-start gap-2">
                                <Info className="h-4 w-4 text-pink-400 mt-0.5 shrink-0" />
                                <p className="text-pink-200 text-sm leading-relaxed">{step?.explanation}</p>
                            </div>
                        </div>

                        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-3">The TCP/IP stack</p>
                            <div className="space-y-1.5 text-xs">
                                {REF_ROWS.map(row => (
                                    <div key={row.layer} className={`px-2 py-1.5 rounded-lg transition-colors ${activeLayer === row.layer ? 'bg-pink-500/15 text-pink-200' : 'text-slate-500'}`}>
                                        <div className="flex justify-between gap-2">
                                            <span className="font-medium">{row.label}</span>
                                            <span className="font-mono text-[10px]">{row.pdu}</span>
                                        </div>
                                        <div className="flex justify-between gap-2 font-mono text-[10px] opacity-80">
                                            <span>addressed by {row.addr}</span>
                                            <span>{row.size}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-2 px-1">Active Recall</p>
                            <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                        </div>

                        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
                            <button onClick={() => setShowCode(c => !c)} className="flex items-center gap-2 text-pink-400 hover:text-pink-300 text-sm font-medium">
                                <Code2 className="h-4 w-4" />
                                {showCode ? 'Hide' : 'Show'} Python: build the headers by hand
                            </button>
                            {showCode && <div className="mt-3"><CodeBlock code={codeExample} language="python" /></div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
