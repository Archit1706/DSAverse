"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info,
    Mail, Binary, DoorOpen, Shuffle, ListTree, Timer, Globe2, Radar,
} from 'lucide-react';

// ── Acts ──────────────────────────────────────────────────────────────────────
const ACTS = [
    { id: 1, label: 'The Envelope', icon: Mail     },
    { id: 2, label: 'Local?',       icon: Binary   },
    { id: 3, label: 'Gateway',      icon: DoorOpen },
    { id: 4, label: 'NAT',          icon: Shuffle  },
    { id: 5, label: 'Prefix Match', icon: ListTree },
    { id: 6, label: 'Hop by Hop',   icon: Timer    },
    { id: 7, label: 'BGP',          icon: Globe2   },
    { id: 8, label: 'Traceroute',   icon: Radar    },
];

// ── IP helpers — the arithmetic on screen is computed, not transcribed ─────────
const toInt = ip => ip.split('.').reduce((a, o) => ((a << 8) >>> 0) + Number(o), 0) >>> 0;
const toIp  = n => [24, 16, 8, 0].map(s => (n >>> s) & 255).join('.');
const netOf = (ip, len) => (toInt(ip) & (len === 0 ? 0 : (0xFFFFFFFF << (32 - len)) >>> 0)) >>> 0;
const binIp = ip => ip.split('.').map(o => Number(o).toString(2).padStart(8, '0'));

const SRC = '192.168.1.42';
const DST = '93.184.216.34';
const MASK = '255.255.255.0';

// ── Topology (persistent) ──────────────────────────────────────────────────────
const NODES = [
    { id: 'laptop', label: 'your laptop',  ip: SRC,             sub: 'private',      x: 38  },
    { id: 'home',   label: 'home router',  ip: '192.168.1.1',   sub: 'NAT · gateway', x: 186 },
    { id: 'isp',    label: 'ISP router',   ip: '198.51.100.1',  sub: 'AS 64500',     x: 334 },
    { id: 'bb',     label: 'backbone',     ip: '203.0.113.9',   sub: 'AS 64510',     x: 482 },
    { id: 'server', label: 'web server',   ip: DST,             sub: 'AS 64520',     x: 630 },
];
const NW = 118, NY = 54, NH = 54;
const cx = n => NODES.find(x => x.id === n).x + NW / 2;
const ANCHOR = Object.fromEntries(NODES.map(n => [n.id, [n.x + NW / 2, NY + NH / 2]]));

// ── Persistent stage ───────────────────────────────────────────────────────────
function NetStage({ step }) {
    const [tx, ty] = step.at ? ANCHOR[step.at] : [-80, -80];
    const hot = step.hot || [];

    return (
        <svg viewBox="0 0 760 430" width="100%" className="max-h-[430px] select-none">
            <style>{`
                .n-box  { transition: fill .4s ease, stroke .4s ease, stroke-width .35s ease; }
                .n-row  { transition: fill .4s ease, opacity .4s ease; }
                .n-fade { transition: opacity .5s ease; }
                .n-flow { stroke-dasharray: 6 5; animation: ndash .55s linear infinite; }
                @keyframes ndash { to { stroke-dashoffset: -22; } }
            `}</style>
            <defs>
                <marker id="nah" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="userSpaceOnUse">
                    <path d="M0,0 L6,3 L0,6 Z" fill="context-stroke" />
                </marker>
            </defs>

            {/* ── Links ── */}
            {NODES.slice(0, -1).map((n, i) => {
                const next = NODES[i + 1];
                const on = step.link === `${n.id}-${next.id}`;
                return (
                    <line key={n.id} x1={n.x + NW} y1={NY + NH / 2} x2={next.x} y2={NY + NH / 2}
                        stroke={on ? '#e4e4e7' : '#334155'} strokeWidth="2"
                        markerEnd="url(#nah)" className={on ? 'n-flow' : ''} />
                );
            })}

            {/* ── Nodes ── */}
            {NODES.map(n => {
                const on = hot.includes(n.id);
                return (
                    <g key={n.id}>
                        <rect x={n.x} y={NY} width={NW} height={NH} rx="9" className="n-box"
                            fill={on ? '#3f3f46' : '#0f172a'} stroke={on ? '#e4e4e7' : '#334155'}
                            strokeWidth={on ? 2.2 : 1.3} />
                        <text x={cx(n.id)} y={NY + 18} textAnchor="middle" fontSize="9"
                            fill={on ? '#f8fafc' : '#94a3b8'} fontFamily="monospace">{n.label}</text>
                        <text x={cx(n.id)} y={NY + 33} textAnchor="middle" fontSize="9.5"
                            fill={on ? '#fde68a' : '#cbd5e1'} fontFamily="monospace">{n.ip}</text>
                        <text x={cx(n.id)} y={NY + 47} textAnchor="middle" fontSize="7.5"
                            fill="#475569" fontFamily="monospace">{n.sub}</text>
                    </g>
                );
            })}

            {/* moving packet */}
            <g style={{ transform: `translate(${tx}px, ${ty}px)`, transition: 'transform .7s cubic-bezier(.45,0,.15,1)' }}>
                <g style={{ opacity: step.at ? 1 : 0, transition: 'opacity .3s ease' }}>
                    <rect x="-19" y="-11" width="38" height="22" rx="4" fill="#0369a1" stroke="#e2e8f0" strokeWidth="1.5" />
                    <text y="4" textAnchor="middle" fontSize="8.5" fontWeight="bold" fill="#f8fafc" fontFamily="monospace">pkt</text>
                </g>
            </g>

            {/* ── Header inspector ── */}
            {step.header && (() => {
                const h = step.header;
                const ch = h.changed || [];
                const rows = [
                    { k: 'source IP',  id: 'srcIP',  v: h.srcIP,  note: 'end to end' },
                    { k: 'dest IP',    id: 'dstIP',  v: h.dstIP,  note: 'never rewritten' },
                    { k: 'TTL',        id: 'ttl',    v: String(h.ttl), note: 'minus one per router' },
                    { k: 'src MAC',    id: 'srcMac', v: h.srcMac, note: 'this link only' },
                    { k: 'dest MAC',   id: 'dstMac', v: h.dstMac, note: 'next hop, not final' },
                ];
                return (
                    <g className="n-fade">
                        <rect x="60" y="152" width="640" height="176" rx="10" fill="#020617" stroke="#334155" strokeWidth="1.4" />
                        <text x="76" y="172" fontSize="9" fill="#64748b" fontFamily="monospace">
                            the packet as it sits on the wire {h.where ? `— ${h.where}` : ''}
                        </text>
                        {rows.map((r, i) => {
                            const changed = ch.includes(r.id);
                            return (
                                <g key={r.id} className="n-row">
                                    {changed && <rect x="70" y={182 + i * 27} width="620" height="24" rx="4" fill="#3a2a0d" />}
                                    <text x="84" y={199 + i * 27} fontSize="10" fill="#64748b" fontFamily="monospace">{r.k}</text>
                                    <text x="240" y={199 + i * 27} fontSize="11" fontFamily="monospace"
                                        fill={changed ? '#fcd34d' : '#e2e8f0'}>{r.v}</text>
                                    <text x="676" y={199 + i * 27} textAnchor="end" fontSize="8.5" fontFamily="monospace"
                                        fill={changed ? '#f59e0b' : '#475569'}>{changed ? 'REWRITTEN' : r.note}</text>
                                </g>
                            );
                        })}
                    </g>
                );
            })()}

            {step.caption && (
                <text x="380" y="404" textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="monospace">{step.caption}</text>
            )}
        </svg>
    );
}

// ── Act 1: the IP header ───────────────────────────────────────────────────────
function HeaderScene({ level }) {
    const rows = [
        [{ t: 'version', w: 12 }, { t: 'IHL', w: 12 }, { t: 'DSCP / ECN', w: 26 }, { t: 'total length', w: 50 }],
        [{ t: 'identification', w: 50 }, { t: 'flags', w: 14 }, { t: 'fragment offset', w: 36 }],
        [{ t: 'TTL', w: 25, hot: true }, { t: 'protocol', w: 25 }, { t: 'header checksum', w: 50 }],
        [{ t: 'source address — 32 bits', w: 100, hot: true }],
        [{ t: 'destination address — 32 bits', w: 100, hot: true }],
    ];
    return (
        <div className="w-full py-2 font-mono">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-3">
                the IPv4 header — 20 bytes wrapped around your data
            </div>
            <div className="space-y-1">
                {rows.map((row, i) => (
                    <div key={i} className="flex gap-1 transition-opacity duration-500"
                        style={{ opacity: i < level ? 1 : 0.1, transitionDelay: `${i * 70}ms` }}>
                        {row.map(c => (
                            <div key={c.t} style={{ width: `${c.w}%` }}
                                className={`px-2 py-2 rounded text-[10px] text-center border ${
                                    c.hot ? 'border-amber-500/60 bg-amber-500/10 text-amber-300' : 'border-slate-700/60 bg-slate-900/50 text-slate-400'
                                }`}>{c.t}</div>
                        ))}
                    </div>
                ))}
            </div>
            <p className={`text-[11px] text-slate-500 mt-4 leading-relaxed transition-opacity duration-500 ${level >= 5 ? 'opacity-100' : 'opacity-0'}`}>
                Three fields carry the routing story: the destination address, which never changes; the source address, so a
                reply can come back; and TTL, which every router decrements. Note what is <span className="text-slate-300">not</span> here —
                no route, no path, no session. Each packet is forwarded independently, and two packets to the same host can
                take entirely different paths.
            </p>
        </div>
    );
}

// ── Act 2: is it local? ────────────────────────────────────────────────────────
function SubnetScene({ level }) {
    const rows = [
        { label: 'my IP', ip: SRC, tone: 'text-sky-300' },
        { label: 'my mask (/24)', ip: MASK, tone: 'text-slate-400' },
        { label: 'my network', ip: toIp(netOf(SRC, 24)), tone: 'text-green-300', res: true },
        { label: 'destination', ip: DST, tone: 'text-amber-300' },
        { label: 'its network (/24)', ip: toIp(netOf(DST, 24)), tone: 'text-red-300', res: true },
    ];
    const same = netOf(SRC, 24) === netOf(DST, 24);
    return (
        <div className="w-full py-2 font-mono">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-3">
                first question: is the destination on my own link?
            </div>
            <div className="space-y-2">
                {rows.map((r, i) => (
                    <div key={r.label} className="flex items-center gap-4 transition-opacity duration-500"
                        style={{ opacity: i < level ? 1 : 0.1, transitionDelay: `${i * 70}ms` }}>
                        <span className="text-[10px] text-slate-500 w-28 shrink-0 text-right">{r.label}</span>
                        <span className={`text-xs w-32 shrink-0 ${r.tone}`}>{r.ip}</span>
                        <span className="text-[10px] text-slate-600 tracking-wider">{binIp(r.ip).join(' ')}</span>
                    </div>
                ))}
            </div>
            <div className={`mt-5 rounded-xl border p-4 transition-opacity duration-500 ${
                level >= 5 ? 'opacity-100' : 'opacity-0'
            } border-red-500/50 bg-red-500/5`}>
                <div className="text-red-300 text-xs mb-1">
                    {toIp(netOf(SRC, 24))} ≠ {toIp(netOf(DST, 24))} → not on my link ({String(same)})
                </div>
                <div className="text-[11px] text-slate-500 leading-relaxed">
                    Masking both addresses and comparing is the entire test. Had they matched, the laptop would ARP for the
                    destination&apos;s MAC and deliver it directly. They do not, so the packet must go to the default gateway.
                </div>
            </div>
        </div>
    );
}

// ── Act 4: NAT ─────────────────────────────────────────────────────────────────
function NatScene({ level }) {
    const entries = [
        { inside: '192.168.1.42:51820', outside: '203.0.113.7:40001', dest: '93.184.216.34:443' },
        { inside: '192.168.1.55:49200', outside: '203.0.113.7:40002', dest: '142.250.72.4:443' },
        { inside: '192.168.1.42:51821', outside: '203.0.113.7:40003', dest: '93.184.216.34:443' },
    ];
    return (
        <div className="w-full py-2 font-mono">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-3">
                the home router&apos;s translation table
            </div>
            <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 overflow-hidden">
                <div className="grid grid-cols-3 gap-2 px-4 py-2 text-[10px] text-slate-500 border-b border-slate-800">
                    <span>inside (private)</span><span>outside (public)</span><span>destination</span>
                </div>
                {entries.map((e, i) => (
                    <div key={i} className="grid grid-cols-3 gap-2 px-4 py-2 text-[11px] transition-opacity duration-500"
                        style={{ opacity: i < level ? 1 : 0.12, transitionDelay: `${i * 90}ms` }}>
                        <span className="text-sky-300">{e.inside}</span>
                        <span className="text-amber-300">{e.outside}</span>
                        <span className="text-slate-500">{e.dest}</span>
                    </div>
                ))}
            </div>
            <p className={`text-[11px] text-slate-500 mt-4 leading-relaxed transition-opacity duration-500 ${level >= 3 ? 'opacity-100' : 'opacity-0'}`}>
                192.168.x.x is private — it is not routable on the internet and every router out there would drop it. So the
                home router rewrites the source to its own public address and picks a unique port, recording the mapping. When
                a reply arrives for port 40001 it looks the row up and rewrites it back. This is why inbound connections need
                explicit port forwarding: with no existing row, the router has no idea which machine a fresh packet is for.
            </p>
        </div>
    );
}

// ── Act 5: longest prefix match ────────────────────────────────────────────────
const ROUTES = [
    { prefix: '0.0.0.0',      len: 0,  via: 'default — upstream peer' },
    { prefix: '10.0.0.0',     len: 8,  via: 'internal' },
    { prefix: '93.0.0.0',     len: 8,  via: 'transit A' },
    { prefix: '93.184.0.0',   len: 16, via: 'transit B' },
    { prefix: '93.184.216.0', len: 24, via: 'peer — AS 64520' },
];
function LpmScene({ level }) {
    const matches = ROUTES.map(r => ({ ...r, hit: netOf(DST, r.len) === netOf(r.prefix, r.len) }));
    const best = matches.filter(m => m.hit).reduce((a, b) => (b.len > a.len ? b : a));
    return (
        <div className="w-full py-2 font-mono">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-3">
                routing table lookup for {DST} — most specific match wins
            </div>
            <div className="space-y-1.5">
                {matches.map((m, i) => {
                    const isBest = level >= 3 && m.prefix === best.prefix && m.len === best.len;
                    return (
                        <div key={`${m.prefix}/${m.len}`} className="flex items-center gap-3 text-[11px] transition-all duration-500"
                            style={{ opacity: level >= 1 ? 1 : 0.1, transitionDelay: `${i * 60}ms` }}>
                            <span className={`px-2 py-1 rounded w-16 text-center shrink-0 ${
                                level < 2 ? 'bg-slate-800 text-slate-600'
                                : m.hit ? 'bg-green-500/20 text-green-300' : 'bg-slate-800 text-slate-600'
                            }`}>{level < 2 ? '—' : m.hit ? 'match' : 'no'}</span>
                            <span className={`w-40 ${isBest ? 'text-white' : 'text-slate-300'}`}>{m.prefix}/{m.len}</span>
                            <span className="text-slate-500">{m.via}</span>
                            {isBest && <span className="ml-auto text-green-400 shrink-0">← chosen (/{m.len} is longest)</span>}
                        </div>
                    );
                })}
            </div>
            <p className={`text-[11px] text-slate-500 mt-5 leading-relaxed transition-opacity duration-500 ${level >= 3 ? 'opacity-100' : 'opacity-0'}`}>
                Four prefixes match this address at once. The router picks the longest — the most specific — because a /24
                describes a smaller, better-known piece of the internet than a /8. Every router on the path repeats this same
                lookup independently. A core router does it against close to a million routes, at line rate, which is why the
                table lives in specialised hardware rather than a general-purpose CPU.
            </p>
        </div>
    );
}

// ── Act 7: BGP ─────────────────────────────────────────────────────────────────
function BgpScene({ level }) {
    const ases = [
        { id: 'AS 64500', role: 'your ISP', x: 4 },
        { id: 'AS 64510', role: 'transit provider', x: 1 },
        { id: 'AS 64520', role: 'the server\'s network', x: 2 },
    ];
    return (
        <div className="w-full py-2 font-mono">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-4">
                how a router learns a route it was never configured with
            </div>
            <div className="flex items-center gap-3 mb-6">
                {ases.map((a, i) => (
                    <div key={a.id} className="flex items-center gap-3 transition-opacity duration-500"
                        style={{ opacity: i < level ? 1 : 0.12, transitionDelay: `${i * 100}ms` }}>
                        <div className="rounded-xl border border-sky-500/50 bg-sky-500/5 px-4 py-3">
                            <div className="text-sky-300 text-xs">{a.id}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">{a.role}</div>
                        </div>
                        {i < ases.length - 1 && <span className="text-slate-600">←</span>}
                    </div>
                ))}
            </div>
            <div className={`rounded-xl border border-slate-700/60 bg-slate-900/50 p-4 transition-opacity duration-500 ${level >= 3 ? 'opacity-100' : 'opacity-0'}`}>
                <div className="text-[11px] text-slate-400 mb-2">the BGP announcement that reached your ISP</div>
                <div className="text-xs text-green-300">93.184.216.0/24 &nbsp;<span className="text-slate-500">AS-PATH</span> &nbsp;64510 64520</div>
                <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
                    AS 64520 tells its neighbours &quot;I can reach 93.184.216.0/24&quot;. Each network that passes the message on
                    prepends its own number, so the path accumulates — which is how BGP detects loops, by refusing any route
                    already containing itself. There is no central map of the internet: every router&apos;s table is assembled
                    from what its neighbours claimed. That trust is also the weakness — a network announcing a prefix it does
                    not own can black-hole or intercept traffic, which is what route leaks and BGP hijacks are, and why RPKI exists.
                </p>
            </div>
        </div>
    );
}

// ── Act 8: traceroute ──────────────────────────────────────────────────────────
function TracerouteScene({ level }) {
    const hops = [
        { n: 1, ttl: 1, host: '192.168.1.1', name: 'home router', ms: '1.2 ms' },
        { n: 2, ttl: 2, host: '198.51.100.1', name: 'ISP router', ms: '9.4 ms' },
        { n: 3, ttl: 3, host: '203.0.113.9', name: 'backbone', ms: '24.1 ms' },
        { n: 4, ttl: 4, host: DST, name: 'destination', ms: '31.7 ms', final: true },
    ];
    return (
        <div className="w-full py-2 font-mono">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-3">
                traceroute weaponises TTL — send TTL=1, then 2, then 3…
            </div>
            <div className="rounded-xl border border-slate-700/60 bg-slate-950 p-4">
                <div className="text-[11px] text-slate-500 mb-2">$ traceroute {DST}</div>
                {hops.map((h, i) => (
                    <div key={h.n} className="flex items-center gap-3 text-[11px] py-0.5 transition-opacity duration-500"
                        style={{ opacity: i < level ? 1 : 0.1, transitionDelay: `${i * 90}ms` }}>
                        <span className="text-slate-600 w-4">{h.n}</span>
                        <span className={h.final ? 'text-green-300 w-32' : 'text-slate-300 w-32'}>{h.host}</span>
                        <span className="text-slate-600 w-28">{h.name}</span>
                        <span className="text-sky-300 w-16">{h.ms}</span>
                        <span className="text-slate-600 text-[10px]">
                            {h.final ? 'port unreachable → done' : `TTL ${h.ttl} → 0 here → ICMP Time Exceeded`}
                        </span>
                    </div>
                ))}
            </div>
            <p className={`text-[11px] text-slate-500 mt-4 leading-relaxed transition-opacity duration-500 ${level >= 4 ? 'opacity-100' : 'opacity-0'}`}>
                Every reply is a router announcing itself by complaining. Send TTL=1 and the first router decrements it to zero,
                drops the packet and returns ICMP Time Exceeded — revealing its address. TTL=2 gets the second, and so on. The
                loop-prevention counter doubles as a network-mapping tool. Hops showing * * * are simply routers configured not
                to send ICMP, not broken links.
            </p>
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
const MAC = { laptop: 'aa:bb:cc:00:11:22', home: 'de:ad:be:ef:00:01', isp: '00:1a:2b:3c:4d:5e', bb: '00:0c:29:aa:bb:cc', server: '00:50:56:12:34:56' };

function generateSteps() {
    const steps = [];
    const s = (act, actName, data, explanation) => steps.push({ act, actName, ...data, explanation });

    // ═══ ACT 1: The Envelope ═══
    s(1, 'The Envelope', { ipHeader: 3 },
        'You click a link and your machine has to get bytes to a server it has never spoken to, across networks nobody owns collectively. It does this by wrapping the data in an IP header — twenty bytes of metadata — and handing it to the nearest router with, essentially, a shrug.');
    s(1, 'The Envelope', { ipHeader: 5 },
        'The header carries no route. There is no path, no circuit, no session — just a destination address, a source address so a reply can find its way back, and a TTL counter. Every packet is forwarded independently on a best-effort basis, which means two packets to the same server can take different paths and arrive out of order. TCP\'s job is to hide that; IP itself promises nothing.');

    // ═══ ACT 2: Local? ═══
    s(2, 'Is It Local?', { subnet: 3 },
        `Before anything is sent, your machine asks one question: is ${DST} on my own network? It answers by masking its own address with its subnet mask — a bitwise AND — to get its network number.`);
    s(2, 'Is It Local?', { subnet: 5 },
        `Mask the destination the same way and compare. ${toIp(netOf(SRC, 24))} against ${toIp(netOf(DST, 24))} — different. Had they matched, the laptop would ARP for the destination's MAC address ("who has this IP?" broadcast on the local link) and deliver the frame directly, with no router involved at all. They do not match, so it needs help.`);

    // ═══ ACT 3: Gateway ═══
    s(3, 'The Default Gateway', {
        at: 'laptop', hot: ['laptop'], link: 'laptop-home',
        header: { where: 'leaving the laptop', srcIP: SRC, dstIP: DST, ttl: 64, srcMac: MAC.laptop, dstMac: MAC.home },
        caption: 'the frame is addressed to the router, but the packet is addressed to the server' },
        'So the packet goes to the default gateway. Now look carefully at the addressing, because this is the part that confuses people: the destination IP is the web server, but the destination MAC is the home router. Your laptop ARPs for the gateway\'s MAC, not the server\'s.');
    s(3, 'The Default Gateway', {
        at: 'home', hot: ['home'],
        header: { where: 'arriving at the home router', srcIP: SRC, dstIP: DST, ttl: 64, srcMac: MAC.laptop, dstMac: MAC.home },
        caption: 'layer 2 is hop-scoped · layer 3 is end-to-end' },
        'That is the layering made concrete. MAC addresses are link-local — they only ever mean anything on one physical segment, and get rewritten at every hop. The IP addresses are end-to-end and survive the whole journey. "Send to that machine, via this next box" is expressed as two different address pairs in the same frame.');

    // ═══ ACT 4: NAT ═══
    s(4, 'NAT', { nat: 1 },
        `Except the packet cannot leave as it stands. ${SRC} is a private address from RFC 1918 — it is not routable on the public internet, and the first ISP router to see it would drop it. Millions of homes use that exact address.`);
    s(4, 'NAT', { nat: 3 },
        'So the home router performs network address translation: it rewrites the source to its own public address, picks a spare port, and records the mapping in a table. Replies to that port get rewritten back on the way in. It is why one public address can serve a whole household — and why unsolicited inbound connections fail, since with no matching row the router does not know which internal machine a fresh packet belongs to. Port forwarding is just pre-seeding that table.');
    s(4, 'NAT', {
        at: 'home', hot: ['home'], link: 'home-isp',
        header: { where: 'leaving the home router', srcIP: '203.0.113.7:40001', dstIP: DST, ttl: 63, srcMac: MAC.home, dstMac: MAC.isp, changed: ['srcIP', 'ttl', 'srcMac', 'dstMac'] },
        caption: 'source rewritten, TTL decremented, both MACs replaced — destination IP untouched' },
        'Watch what changed on the way out. The source IP was rewritten by NAT, the TTL dropped by one because a router forwarded it, and both MAC addresses were replaced for the new link. The destination IP is the one thing that has not moved — and will not, all the way to the server.');

    // ═══ ACT 5: Longest Prefix Match ═══
    s(5, 'Longest Prefix Match', { lpm: 1 },
        'The ISP router now has to decide where to send it. It consults its routing table — a list of destination prefixes and the neighbour to use for each. It does not know the full path to the server; it only knows the next box to hand the packet to. That is all any router knows.');
    s(5, 'Longest Prefix Match', { lpm: 2 },
        `Several entries match ${DST} simultaneously: a /8, a /16, a /24 and the catch-all default route. Matching is not exclusive, so the router needs a tie-break rule.`);
    s(5, 'Longest Prefix Match', { lpm: 3 },
        'The rule is longest prefix match: the most specific route wins, because a longer prefix describes a smaller and better-known slice of the address space. The /24 beats the /16 beats the /8 beats the default. Core routers repeat this against close to a million prefixes for every packet at line rate, which is why the table lives in dedicated hardware rather than being walked by a CPU.');

    // ═══ ACT 6: Hop by Hop ═══
    s(6, 'Hop by Hop', {
        at: 'isp', hot: ['isp'], link: 'isp-bb',
        header: { where: 'leaving the ISP router', srcIP: '203.0.113.7:40001', dstIP: DST, ttl: 62, srcMac: MAC.isp, dstMac: MAC.bb, changed: ['ttl', 'srcMac', 'dstMac'] },
        caption: 'same decision, repeated independently at every router' },
        'And now it simply repeats. Each router receives the frame, strips the link-layer header, looks up the destination, decrements TTL, builds a fresh link-layer header for the outgoing interface, and forwards. No router has a plan for the whole journey; the path is an emergent result of many independent local decisions.');
    s(6, 'Hop by Hop', {
        at: 'bb', hot: ['bb'], link: 'bb-server',
        header: { where: 'leaving the backbone router', srcIP: '203.0.113.7:40001', dstIP: DST, ttl: 61, srcMac: MAC.bb, dstMac: MAC.server, changed: ['ttl', 'srcMac', 'dstMac'] },
        caption: 'TTL 64 → 61 after three routers' },
        'TTL exists because those independent decisions can form a loop — a misconfiguration where A sends to B and B sends back to A. Without a counter such a packet would circulate forever, and enough of them would saturate the link. Every router decrements it; at zero the packet is discarded. Starting values are conventional: 64 on Linux and macOS, 128 on Windows, which is why you can often guess a host\'s OS from a ping reply.');
    s(6, 'Hop by Hop', {
        at: 'server', hot: ['server'],
        header: { where: 'arriving at the server', srcIP: '203.0.113.7:40001', dstIP: DST, ttl: 61, srcMac: MAC.bb, dstMac: MAC.server },
        caption: 'destination IP identical to the moment it left the laptop' },
        'The packet arrives. Its destination IP is byte-for-byte what your laptop wrote; the source IP was rewritten once by NAT; the TTL is down by the number of routers crossed; and the MAC addresses have been replaced at every single hop. Then the whole process runs in reverse for the reply, along a path that need not be the same one.');

    // ═══ ACT 7: BGP ═══
    s(7, 'How Routers Know', { bgp: 1 },
        'One question is still open: how did the ISP router know that /24 route in the first place? Nobody configured it by hand, and there is no master directory of the internet to consult.');
    s(7, 'How Routers Know', { bgp: 2 },
        'The internet is about eighty thousand independently operated networks, called autonomous systems — ISPs, universities, cloud providers, large companies. Each runs its own internal routing however it likes. Between them they speak exactly one protocol: BGP.');
    s(7, 'How Routers Know', { bgp: 3 },
        'BGP is a path-vector protocol built on announcements. A network says "I can reach this prefix", and each network relaying the message prepends its own AS number, so the path accumulates. Loop detection falls out of that: a router rejects any route whose path already contains itself. Route choice is driven far more by business policy — who is a paying customer, who is a peer — than by shortest distance. And because it runs on assertion rather than proof, a network announcing a prefix it does not own can hijack traffic, which is what RPKI and route filtering exist to prevent.');

    // ═══ ACT 8: Traceroute ═══
    s(8, 'Traceroute', { trace: 1 },
        'One last thing, which ties the pieces together neatly. If every router decrements TTL and reports back when it hits zero, you can abuse that to map the path.');
    s(8, 'Traceroute', { trace: 3 },
        'Send a packet with TTL=1 and the first router decrements it to zero, discards it, and returns an ICMP Time Exceeded message — which necessarily contains its own source address. Now you know hop one. Send TTL=2 to learn hop two, and so on.');
    s(8, 'Traceroute', { trace: 4 },
        'Each line of traceroute output is a router revealing itself by complaining. The loop-prevention counter turns out to be a network-mapping tool. And the caveats follow from what we have seen: hops showing * * * are routers configured not to reply, not broken links; the reverse path can differ from the forward one, so latencies sometimes look impossible; and load balancing means consecutive probes may traverse genuinely different routers.');
    s(8, 'Traceroute', {
        recap: true,
        wins: [
            { t: 'No packet knows its route', d: 'The header carries a destination, not a path. Each router makes an independent local decision; the route is emergent.' },
            { t: 'L2 is per-hop, L3 is end-to-end', d: 'MAC addresses are rewritten at every hop; the destination IP survives untouched. Both live in the same frame.' },
            { t: 'Longest prefix wins', d: 'Many routes can match one address. The most specific is chosen — a /24 beats a /16 beats the default route.' },
            { t: 'BGP runs on assertion', d: 'Networks announce what they can reach and prepend themselves to the path. No central map — which is why hijacks are possible.' },
        ],
    }, 'That is the journey: mask and compare to find it is not local, hand it to the gateway, NAT the source, then a sequence of routers each doing longest-prefix-match against tables built from BGP announcements, decrementing TTL and rewriting link-layer headers as they go. Nothing in the middle knows the whole path and nothing guarantees delivery — the reliability you experience is built on top by TCP. The internet works less like a postal service with a plan and more like passing a letter to whoever is standing nearest the right direction, several million times a second.');

    return steps;
}

// ── Router ──────────────────────────────────────────────────────────────────────
function VisualizationPanel({ step }) {
    if (!step) return null;
    if (step.recap)    return <RecapCards wins={step.wins} />;
    if (step.ipHeader) return <HeaderScene level={step.ipHeader} />;
    if (step.subnet)   return <SubnetScene level={step.subnet} />;
    if (step.nat)      return <NatScene level={step.nat} />;
    if (step.lpm)      return <LpmScene level={step.lpm} />;
    if (step.bgp)      return <BgpScene level={step.bgp} />;
    if (step.trace)    return <TracerouteScene level={step.trace} />;
    return <NetStage step={step} />;
}

// ── Quiz ────────────────────────────────────────────────────────────────────────
const QUIZ = [
    {
        question: 'A packet leaves your laptop for a server on the internet. What are the destination IP and destination MAC set to?',
        options: [
            'Both are the server — MAC is resolved by ARP across the internet',
            'Destination IP is the server; destination MAC is your default gateway, because MAC addresses only have meaning on the local link',
            'Both are the gateway, and the router rewrites the IP later',
            'The MAC is left empty until the packet reaches the ISP',
        ],
        correct: 1,
        explanation: 'Layer 2 addressing is hop-scoped and layer 3 is end-to-end. Your laptop ARPs for the gateway\'s MAC — ARP is a local broadcast and cannot reach across routers. Every hop rewrites both MAC addresses for its own link while the destination IP stays untouched the entire way.',
    },
    {
        question: 'A routing table contains 0.0.0.0/0, 93.0.0.0/8, 93.184.0.0/16 and 93.184.216.0/24. Which is used for 93.184.216.34?',
        options: [
            'The default route, since it always matches',
            '93.0.0.0/8, because shorter prefixes are cheaper to look up',
            '93.184.216.0/24 — all four match, and the longest (most specific) prefix wins',
            'Whichever appears first in the table',
        ],
        correct: 2,
        explanation: 'All four entries match this address; matching is not exclusive. Longest prefix match resolves it: a /24 describes a smaller, more specific slice of address space than a /16 or /8, so it is preferred. The default route /0 matches everything and is the fallback of last resort.',
    },
    {
        question: 'How does traceroute discover the routers along a path?',
        options: [
            'It asks each router for its neighbour list',
            'It reads the path recorded in the IP header',
            'It sends packets with TTL=1, 2, 3… — each router that decrements TTL to zero discards the packet and returns an ICMP Time Exceeded message revealing its own address',
            'It queries BGP for the full AS path',
        ],
        correct: 2,
        explanation: 'The IP header records no path, and routers keep no such list for callers. Traceroute exploits TTL: a packet with TTL=1 dies at the first router, which reports back with ICMP Time Exceeded containing its own source address. Incrementing the TTL walks the path one hop at a time. Hops showing * * * are routers configured not to send ICMP.',
    },
];

function QuizPanel({ quizState, setQuizState }) {
    const q = QUIZ[quizState.current];
    if (quizState.complete) {
        return (
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-5 text-center">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{QUIZ.length}</div>
                <div className="text-zinc-400 text-sm mb-4">
                    {quizState.score === QUIZ.length ? 'Perfect — you can read a traceroute now!' : 'Review the explanations to reinforce the path.'}
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

export default function PacketRoutingPage() {
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
                            <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">How the Internet Routes a Packet</h1>
                            <p className="text-zinc-300 text-sm mt-1">
                                Subnet masks, ARP, NAT, longest prefix match, TTL and BGP — no packet ever knows its own route
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
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-3">Mechanisms</p>
                            <div className="space-y-1.5 text-xs">
                                {[
                                    { acts: [1],    label: 'IP header',  note: '20 bytes · no path' },
                                    { acts: [2],    label: 'Subnet mask', note: 'AND, then compare' },
                                    { acts: [2, 3], label: 'ARP',        note: 'IP → MAC, local only' },
                                    { acts: [3, 6], label: 'L2 vs L3',   note: 'per-hop vs end-to-end' },
                                    { acts: [4],    label: 'NAT',        note: 'rewrite + table' },
                                    { acts: [5],    label: 'Prefix match', note: 'longest wins' },
                                    { acts: [6, 8], label: 'TTL',        note: '64 → 0, then ICMP' },
                                    { acts: [7],    label: 'BGP',        note: 'AS path announcements' },
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
