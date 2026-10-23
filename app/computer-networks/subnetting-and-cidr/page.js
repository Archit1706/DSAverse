"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, RotateCcw, SkipForward, SkipBack, Shuffle, Info, Code2, Binary, CheckCircle, XCircle,
} from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── 32-bit helpers — everything on screen is computed from these ─────────── */
const toInt = (ip) => ip.split('.').reduce((a, o) => a * 256 + Number(o), 0);
const toIp = (n) => [24, 16, 8, 0].map(s => (n >>> s) & 255).join('.');
const maskOf = (len) => (len === 0 ? 0 : (0xFFFFFFFF << (32 - len)) >>> 0);
const bitsOf = (n) => (n >>> 0).toString(2).padStart(32, '0');
const parseIp = (s) => {
    const t = s.trim();
    if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(t)) return null;
    return t.split('.').every(o => Number(o) <= 255) ? t.split('.').map(Number).join('.') : null;
};

const PRESETS = [
    { ip: '192.168.10.77', prefix: 26, other: '192.168.10.130' },
    { ip: '10.4.200.9',    prefix: 12, other: '10.15.0.1' },
    { ip: '203.0.113.200', prefix: 27, other: '203.0.113.190' },
    { ip: '172.16.5.4',    prefix: 30, other: '172.16.5.6' },
    { ip: '198.51.100.10', prefix: 31, other: '198.51.100.11' },
];

/** Network facts for an address and prefix, including the /31 and /32 cases. */
function subnetFacts(ipStr, prefix) {
    const ip = toInt(ipStr);
    const mask = maskOf(prefix);
    const network = (ip & mask) >>> 0;
    const broadcast = (network | (~mask >>> 0)) >>> 0;
    const size = 2 ** (32 - prefix);
    let first, last, usable;
    if (prefix === 32) { first = last = network; usable = 1; }
    else if (prefix === 31) { first = network; last = broadcast; usable = 2; }
    else { first = network + 1; last = broadcast - 1; usable = size - 2; }
    return { ip, mask, network, broadcast, size, first, last, usable };
}

function generateSteps({ ip: ipStr, prefix, other: otherStr }) {
    const f = subnetFacts(ipStr, prefix);
    const other = toInt(otherStr);
    const otherNet = (other & f.mask) >>> 0;
    const same = otherNet === f.network;
    const hostBits = 32 - prefix;
    const base = { ipStr, prefix, otherStr, ...f, other, otherNet, same, hostBits };
    const steps = [];
    const s = (stage, show, explanation, extra = {}) => steps.push({ ...base, stage, show, explanation, ...extra });

    s('ip', { mask: false },
        `${ipStr} is how people write it, but a router sees 32 bits: four 8-bit octets, each written as a number from 0 to 255. Every subnet calculation is a bit operation on these 32 bits.`);
    s('mask', { mask: true },
        `/${prefix} is the prefix length: the first ${prefix} bits name the network and the remaining ${hostBits} name a host inside it. As a mask that is ${prefix} ones followed by ${hostBits} zeros — ${toIp(f.mask)} in dotted form.`);
    s('network', { mask: true, network: true },
        `AND the address with the mask. Where the mask is 1 the address bit is copied; where it is 0 the result is 0. The host bits are wiped, leaving the network address ${toIp(f.network)} — the name of the whole subnet.`,
        { changed: 'network' });
    s('broadcast', { mask: true, network: true, broadcast: true },
        prefix >= 31
            ? `Now set every host bit to 1. With only ${hostBits} host bit${hostBits === 1 ? '' : 's'} that gives ${toIp(f.broadcast)}. A /${prefix} is special: ${prefix === 32 ? 'it names exactly one host, with no network or broadcast address of its own.' : 'its two addresses are used for the two ends of a point-to-point link (RFC 3021), with no broadcast at all.'}`
            : `Now do the opposite: OR the network address with the inverted mask, setting every host bit to 1. That is the broadcast address ${toIp(f.broadcast)} — a packet sent there reaches every host on the subnet.`,
        { changed: 'broadcast' });
    s('range', { mask: true, network: true, broadcast: true, range: true },
        prefix >= 31
            ? `${prefix === 32 ? 'One address, one host' : 'Two addresses, two hosts'}: ${toIp(f.first)}${prefix === 31 ? ` and ${toIp(f.last)}` : ''}. Nothing is reserved.`
            : `${hostBits} host bits give 2^${hostBits} = ${f.size.toLocaleString()} addresses. The all-zeros one is the network and the all-ones one is the broadcast, so ${f.usable.toLocaleString()} can be given to hosts: ${toIp(f.first)} to ${toIp(f.last)}.`);
    s('other', { mask: true, network: true, broadcast: true, range: true, other: true },
        `A second host, ${otherStr}, wants to talk to ${ipStr}. If they share a subnet it can deliver the packet directly on the link, with ARP; if not, it must hand it to its gateway. Which is it?`);
    s('compare', { mask: true, network: true, broadcast: true, range: true, other: true, otherNet: true },
        same
            ? `Mask ${otherStr} with the same /${prefix}: the network bits come out as ${toIp(otherNet)}, identical to ${toIp(f.network)}. Same subnet — the two can reach each other directly.`
            : `Mask ${otherStr} with the same /${prefix}: its network is ${toIp(otherNet)}, not ${toIp(f.network)}. Different subnets, so traffic between them has to go through a router, even if the addresses look close.`,
        { changed: 'otherNet' });
    s('ruler', { mask: true, network: true, broadcast: true, range: true, other: true, otherNet: true, ruler: true },
        `Zoom out: a /${prefix} is one of many equal blocks of ${f.size.toLocaleString()} addresses, each starting at a multiple of ${f.size.toLocaleString()}. Two addresses share a subnet exactly when they fall in the same block — which is all the AND test checks.`);
    return steps;
}

/* Three questions the bits on screen answer. Options for the address and the
   count come from live values, so they are sorted and then rotated by a value
   taken from the input, not by which one is right. */
const predictFor = (step, next) => {
    if (!step || !next) return null;
    const rot = (vals, k) => { const r = k % vals.length; return [...vals.slice(r), ...vals.slice(0, r)]; };

    if (step.stage === 'mask' && next.stage === 'network') {
        const octet = Math.min(3, Math.floor(step.prefix / 8));
        const classful = (step.ip & maskOf(octet * 8)) >>> 0;   // zero everything from the cut octet on
        const pool = [step.network, step.ip, classful, step.network + step.size, step.network - step.size]
            .filter(v => v >= 0 && v <= 0xFFFFFFFF);
        const vals = [...new Set(pool)].slice(0, 4).sort((a, b) => a - b);
        const ordered = rot(vals, step.ip & 255);
        return {
            question: `${step.ipStr}/${step.prefix} — mask ${toIp(step.mask)}. What is the network address?`,
            options: ordered.map(toIp),
            correct: ordered.indexOf(next.network),
            because: `Keep the first ${step.prefix} bits and zero the other ${step.hostBits}. Blocks of ${step.size.toLocaleString()} start at multiples of ${step.size.toLocaleString()}, and ${toIp(step.network)} is the one containing ${step.ipStr}.`,
        };
    }
    if (step.stage === 'broadcast' && next.stage === 'range') {
        const h = step.hostBits;
        const pool = [step.usable, 2 ** h, 2 ** h - 1, 2 ** h - 2, 2 ** (h + 1) - 2].filter(v => v >= 0);
        const vals = [...new Set(pool)].slice(0, 4).sort((a, b) => a - b);
        const ordered = rot(vals, step.prefix);
        return {
            question: `A /${step.prefix} leaves ${h} host bit${h === 1 ? '' : 's'}. How many addresses can be given to hosts?`,
            options: ordered.map(v => v.toLocaleString()),
            correct: ordered.indexOf(next.usable),
            because: step.prefix === 32 ? 'A /32 is a single address, a single host.'
                : step.prefix === 31 ? 'A /31 is a point-to-point link: both addresses are hosts, nothing is reserved (RFC 3021).'
                : `2^${h} = ${(2 ** h).toLocaleString()} addresses, minus the network (all zeros) and the broadcast (all ones).`,
        };
    }
    if (step.stage === 'other' && next.stage === 'compare') {
        return {
            question: `Is ${step.otherStr} on the same /${step.prefix} subnet as ${step.ipStr}?`,
            options: ['Yes — same subnet, deliver directly', 'No — different subnets, go via the router'],
            correct: next.same ? 0 : 1,
            because: `${step.otherStr} AND ${toIp(step.mask)} = ${toIp(next.otherNet)}, ${next.same ? 'the same as' : 'which differs from'} ${toIp(step.network)}.`,
        };
    }
    return null;
};

const quizQuestions = [
    {
        question: 'How many usable host addresses does a /26 subnet have?',
        options: ['26', '62', '64', '30'],
        correct: 1,
        explanation: 'A /26 leaves 32 − 26 = 6 host bits: 2^6 = 64 addresses. The all-zeros address is the network and the all-ones address is the broadcast, so 62 are usable.',
    },
    {
        question: 'What is the network address of 10.20.30.40/20?',
        options: ['10.20.0.0', '10.20.16.0', '10.20.30.0', '10.20.32.0'],
        correct: 1,
        explanation: 'A /20 mask is 255.255.240.0. Only the third octet is cut: 30 is 0001 1110, AND 1111 0000 gives 0001 0000 = 16. So the network is 10.20.16.0, a block running from 10.20.16.0 to 10.20.31.255.',
    },
    {
        question: 'Are 172.16.5.14/29 and 172.16.5.17/29 on the same subnet?',
        options: [
            'Yes — they differ only in the last octet',
            'Yes — /29 subnets hold up to 8 addresses and they are 3 apart',
            'No — /29 blocks are .8–.15 and .16–.23, so they fall in different blocks',
            'It depends on the default gateway',
        ],
        correct: 2,
        explanation: 'A /29 makes blocks of 8 that start at multiples of 8. 14 AND 248 = 8 and 17 AND 248 = 16 — different network addresses. Being numerically close says nothing; what matters is which block each falls in.',
    },
];

function QuizPanel({ quizState, setQuizState }) {
    const q = quizQuestions[quizState.current];
    if (quizState.complete) {
        return (
            <div className="text-center py-2">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{quizQuestions.length}</div>
                <div className="text-pink-300/80 text-sm mb-4">{quizState.score === quizQuestions.length ? 'Perfect — you can subnet in your head.' : 'Try a few random subnets and retry.'}</div>
                <button onClick={() => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false })}
                    className="px-4 py-2 bg-pink-500 hover:bg-pink-600 rounded-lg text-sm text-white transition-colors">Try Again</button>
            </div>
        );
    }
    return (
        <div>
            <p className="text-xs text-slate-500 mb-2">Question {quizState.current + 1} of {quizQuestions.length}</p>
            <p className="text-sm font-medium text-slate-200 mb-3">{q.question}</p>
            <div className="space-y-2">
                {q.options.map((opt, i) => {
                    let cls = 'w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors ';
                    if (!quizState.answered) cls += 'border-slate-600 text-slate-300 hover:border-pink-500 hover:text-white bg-slate-800/50';
                    else if (i === q.correct) cls += 'border-green-500 bg-green-500/10 text-green-300';
                    else if (i === quizState.selected) cls += 'border-red-500 bg-red-500/10 text-red-300';
                    else cls += 'border-slate-700 text-slate-500 bg-slate-800/30';
                    return (
                        <button key={i} className={cls} onClick={() => {
                            if (quizState.answered) return;
                            const correct = i === q.correct;
                            setQuizState(s => ({ ...s, selected: i, answered: true, score: correct ? s.score + 1 : s.score }));
                        }}>{opt}</button>
                    );
                })}
            </div>
            {quizState.answered && (
                <div className="mt-3">
                    <p className="text-xs text-slate-400 mb-3 leading-relaxed">{q.explanation}</p>
                    <button onClick={() => {
                        if (quizState.current + 1 >= quizQuestions.length) setQuizState(s => ({ ...s, complete: true }));
                        else setQuizState(s => ({ ...s, current: s.current + 1, selected: null, answered: false }));
                    }} className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors text-sm font-medium">
                        {quizState.current + 1 >= quizQuestions.length ? 'See Results' : 'Next Question'}
                    </button>
                </div>
            )}
        </div>
    );
}

/* ── 32-bit register, after the Bit Manipulation pages' BitRow ──────────────
   Bits left of the prefix boundary are the network part (pink), the rest the
   host part (slate). `changedFrom` marks bits that differ from another row —
   the ones an AND or OR actually flipped. */
function AddrRow({ label, value, prefix, changedFrom, tone = 'text-slate-200', note }) {
    const bits = bitsOf(value);
    const ref = changedFrom !== undefined ? bitsOf(changedFrom) : null;
    return (
        <div className="space-y-1">
            <div className="flex items-baseline justify-between gap-3">
                <span className="text-[11px] text-slate-400">{label}{note && <span className="text-slate-600"> · {note}</span>}</span>
                <span className={`font-mono text-sm font-semibold ${tone}`}>{toIp(value)}</span>
            </div>
            <div className="flex flex-wrap gap-x-2 gap-y-1">
                {[0, 1, 2, 3].map(o => (
                    <div key={o} className="flex gap-px">
                        {bits.slice(o * 8, o * 8 + 8).split('').map((b, k) => {
                            const i = o * 8 + k;
                            const isNet = prefix != null && i < prefix;
                            const changed = ref && ref[i] !== b;
                            const on = b === '1';
                            const cls = changed ? 'bg-orange-500 text-white scale-105'
                                : prefix == null ? (on ? 'bg-slate-500 text-white' : 'bg-slate-800 text-slate-500')
                                : isNet ? (on ? 'bg-pink-500 text-white' : 'bg-pink-950/70 text-pink-300/70')
                                : (on ? 'bg-slate-500 text-white' : 'bg-slate-800 text-slate-500');
                            return (
                                /* 32 cells must fit one line in the 2/3-width panel: 15px at lg, 18px from xl */
                                <div key={k} className={`w-4 lg:w-[15px] xl:w-[18px] h-7 rounded-sm flex items-center justify-center text-[11px] lg:text-[10px] xl:text-[11px] font-mono font-bold transition-all duration-300 ${cls} ${prefix != null && i === prefix - 1 && prefix < 32 ? 'mr-1 border-r-2 border-pink-300' : ''}`}>
                                    {b}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}

function BlockRuler({ step }) {
    const P = Math.max(0, step.prefix - 4);
    const parentMask = maskOf(P);
    const parentNet = (step.ip & parentMask) >>> 0;
    const parentSize = 2 ** (32 - P);
    const blocks = 2 ** (step.prefix - P);
    const myBlock = Math.floor((step.ip - parentNet) / step.size);
    const pos = (a) => ((a - parentNet) / parentSize) * 100;
    const otherInside = step.other >= parentNet && step.other < parentNet + parentSize;
    return (
        <div className="font-mono">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2">
                {toIp(parentNet)}/{P} cut into {blocks} blocks of /{step.prefix}
            </div>
            <div className="relative h-9 flex rounded overflow-hidden border border-slate-700">
                {Array.from({ length: blocks }).map((_, b) => (
                    <div key={b} className={`flex-1 border-r border-slate-950/70 ${b === myBlock ? 'bg-pink-500/40' : b % 2 ? 'bg-slate-800' : 'bg-slate-800/60'}`} />
                ))}
                <div className="absolute top-0 bottom-0 w-0.5 bg-pink-200" style={{ left: `${pos(step.ip)}%` }} />
                {otherInside && <div className="absolute top-0 bottom-0 w-0.5 bg-sky-300" style={{ left: `${pos(step.other)}%` }} />}
            </div>
            <div className="relative h-8 text-[10px]">
                <span className="absolute left-0 text-slate-500">{toIp(parentNet)}</span>
                <span className="absolute right-0 text-slate-500">{toIp(parentNet + parentSize - 1)}</span>
                <span className="absolute top-3.5 text-pink-300 -translate-x-1/2 whitespace-nowrap" style={{ left: `${Math.min(88, Math.max(12, pos(step.ip)))}%` }}>A {step.ipStr}</span>
            </div>
            <p className="text-[11px] mt-1 text-slate-400">
                {otherInside
                    ? <><span className="text-sky-300">B {step.otherStr}</span> lands in block {Math.floor((step.other - parentNet) / step.size)}; A is in block {myBlock}.</>
                    : <><span className="text-sky-300">B {step.otherStr}</span> is outside this /{P} altogether — further away still.</>}
            </p>
        </div>
    );
}

const codeExample = `import ipaddress

iface = ipaddress.ip_interface('192.168.10.77/26')
net = iface.network                      # IPv4Network('192.168.10.64/26')

print(net.netmask)                       # 255.255.255.192
print(net.network_address)               # 192.168.10.64   address AND mask
print(net.broadcast_address)             # 192.168.10.127  network OR NOT mask
hosts = list(net.hosts())
print(hosts[0], hosts[-1], len(hosts))   # 192.168.10.65 192.168.10.126 62

other = ipaddress.ip_address('192.168.10.130')
print(other in net)                      # False

# The same test with plain integers — exactly what a host does
ip, mask = int(iface.ip), int(net.netmask)
print((ip & mask) == (int(other) & mask))   # False: 64 != 128`;

export default function SubnettingPage() {
    const [cfg, setCfg] = useState(PRESETS[0]);
    const [draft, setDraft] = useState({ ip: PRESETS[0].ip, other: PRESETS[0].other });
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1400);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const stepHistory = useMemo(() => generateSteps(cfg), [cfg]);

    useEffect(() => {
        if (!isPlaying) return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const pauseForPredict = useCallback(() => setIsPlaying(false), []);
    const predict = usePredict(stepHistory, currentStep, predictFor, pauseForPredict);
    const step = stepHistory[Math.min(currentStep, stepHistory.length - 1)];

    const load = (next) => { setCfg(next); setDraft({ ip: next.ip, other: next.other }); setCurrentStep(0); setIsPlaying(false); predict.reset(); };
    const ipOk = parseIp(draft.ip), otherOk = parseIp(draft.other);
    const applyDraft = () => { if (ipOk && otherOk) load({ ip: ipOk, prefix: cfg.prefix, other: otherOk }); };
    const shuffle = () => {
        const prefix = 8 + Math.floor(Math.random() * 23);           // /8 .. /30
        const ipN = ((1 + Math.floor(Math.random() * 223)) * 2 ** 24 + Math.floor(Math.random() * 2 ** 24)) >>> 0;
        const { network, size } = subnetFacts(toIp(ipN), prefix);
        const pickIn = (net) => net + 1 + Math.floor(Math.random() * Math.max(1, size - 2));
        const r = Math.random();
        const otherN = r < 0.45 ? pickIn(network)
            : r < 0.8 ? pickIn((network + size * (Math.random() < 0.5 ? 1 : -1) + 2 ** 32) % 2 ** 32)
            : (ipN ^ (1 << Math.floor(Math.random() * 32))) >>> 0;
        load({ ip: toIp(ipN), prefix, other: toIp(otherN >>> 0) });
    };

    const sh = step.show;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-pink-500 to-rose-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/computer-networks" className="flex items-center text-white hover:text-pink-100 transition-colors mb-6 w-fit">
                        <ArrowLeft className="h-5 w-5 mr-2" />Back to Computer Networks
                    </Link>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Subnetting and CIDR</h1>
                        <p className="text-lg text-pink-100 mb-6 max-w-3xl mx-auto">
                            An IPv4 address is 32 bits and a prefix length draws one line through them. Everything else — network,
                            broadcast, host range, &quot;is it local?&quot; — is an AND or an OR.
                        </p>
                        <div className="flex flex-wrap justify-center gap-3 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Network = IP AND mask</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Broadcast = network OR NOT mask</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Hosts = 2^h − 2</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            {/* Inputs */}
                            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 mb-4 items-end">
                                <label className="text-xs text-slate-400">Host A
                                    <input value={draft.ip} onChange={e => setDraft(d => ({ ...d, ip: e.target.value }))} onBlur={applyDraft}
                                        onKeyDown={e => { if (e.key === 'Enter') applyDraft(); }}
                                        className={`mt-1 w-full bg-slate-800 border rounded-lg px-3 py-2 font-mono text-sm text-slate-100 ${ipOk ? 'border-slate-700' : 'border-red-500'}`} />
                                </label>
                                <label className="text-xs text-slate-400">Prefix /{cfg.prefix}
                                    <input type="range" min="8" max="32" value={cfg.prefix}
                                        onChange={e => load({ ...cfg, prefix: Number(e.target.value) })} className="mt-3 w-full sm:w-36 accent-pink-500 block" />
                                </label>
                                <label className="text-xs text-slate-400">Host B
                                    <input value={draft.other} onChange={e => setDraft(d => ({ ...d, other: e.target.value }))} onBlur={applyDraft}
                                        onKeyDown={e => { if (e.key === 'Enter') applyDraft(); }}
                                        className={`mt-1 w-full bg-slate-800 border rounded-lg px-3 py-2 font-mono text-sm text-slate-100 ${otherOk ? 'border-slate-700' : 'border-red-500'}`} />
                                </label>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mb-4">
                                <span className="text-xs text-slate-500 mr-1">Presets</span>
                                {PRESETS.map(p => (
                                    <button key={`${p.ip}/${p.prefix}`} onClick={() => load(p)}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition-colors ${cfg.ip === p.ip && cfg.prefix === p.prefix ? 'bg-pink-500/20 border-pink-500/60 text-pink-200' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-pink-500/60'}`}>
                                        {p.ip}/{p.prefix}
                                    </button>
                                ))}
                            </div>

                            <div className="flex flex-wrap gap-3 mb-4">
                                <button onClick={() => setIsPlaying(p => !p)} disabled={currentStep >= stepHistory.length - 1 && !isPlaying}
                                    className="flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors font-medium disabled:opacity-50">
                                    {isPlaying ? <Pause size={18} /> : <Play size={18} />}{isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={() => setCurrentStep(s => Math.max(0, s - 1))} disabled={isPlaying || currentStep === 0}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors font-medium disabled:opacity-50">
                                    <SkipBack size={18} />Back
                                </button>
                                <button onClick={() => setCurrentStep(s => Math.min(stepHistory.length - 1, s + 1))} disabled={isPlaying || currentStep >= stepHistory.length - 1}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors font-medium disabled:opacity-50">
                                    <SkipForward size={18} />Forward
                                </button>
                                <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors font-medium">
                                    <RotateCcw size={18} />Reset
                                </button>
                                <button onClick={shuffle} className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors font-medium">
                                    <Shuffle size={18} />Random subnet
                                </button>
                                <PredictToggle predict={predict} accent="pink" />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2 text-slate-300">Animation Speed: {speed}ms</label>
                                <input type="range" min="200" max="2000" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-full max-w-md accent-pink-500" />
                            </div>
                            <div className="flex justify-between items-center mb-2 text-sm">
                                <span className="text-slate-300">Step {currentStep + 1} of {stepHistory.length}</span>
                                <span className="text-slate-500 font-mono text-xs">{step.ipStr}/{step.prefix}</span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-1.5 mb-5">
                                <div className="bg-pink-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${((currentStep + 1) / stepHistory.length) * 100}%` }} />
                            </div>

                            {/* Registers */}
                            <div className="bg-slate-950/60 rounded-lg border border-slate-800 p-4 space-y-4 min-h-[300px]">
                                <AddrRow label="host A" value={step.ip} prefix={sh.mask ? step.prefix : null} tone="text-pink-200" />
                                {sh.mask && <AddrRow label={`mask /${step.prefix}`} value={step.mask} prefix={step.prefix} tone="text-slate-300" note={`${step.prefix} ones, ${step.hostBits} zeros`} />}
                                {sh.network && (
                                    <>
                                        <div className="text-[10px] font-mono text-slate-600 tracking-widest">AND ↓</div>
                                        <AddrRow label="network address" value={step.network} prefix={step.prefix} tone="text-green-300"
                                            changedFrom={step.changed === 'network' ? step.ip : undefined} note="host bits zeroed" />
                                    </>
                                )}
                                {sh.broadcast && (
                                    <AddrRow label="broadcast address" value={step.broadcast} prefix={step.prefix} tone="text-amber-300"
                                        changedFrom={step.changed === 'broadcast' ? step.network : undefined} note="host bits set to 1" />
                                )}
                                {sh.other && (
                                    <div className="pt-3 border-t border-slate-800 space-y-4">
                                        <AddrRow label="host B" value={step.other} prefix={step.prefix} tone="text-sky-300" />
                                        {sh.otherNet && (
                                            <AddrRow label="host B AND mask" value={step.otherNet} prefix={step.prefix} tone={step.same ? 'text-green-300' : 'text-red-300'}
                                                changedFrom={step.changed === 'otherNet' ? step.other : undefined} />
                                        )}
                                    </div>
                                )}
                            </div>

                            {sh.range && (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                                    {[
                                        ['addresses', step.size.toLocaleString()],
                                        ['usable hosts', step.usable.toLocaleString()],
                                        ['first host', toIp(step.first)],
                                        ['last host', toIp(step.last)],
                                    ].map(([k, v]) => (
                                        <div key={k} className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2">
                                            <div className="text-[10px] uppercase tracking-widest text-slate-500">{k}</div>
                                            <div className="font-mono text-sm font-semibold text-slate-100 truncate">{v}</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {sh.otherNet && (
                                <div className={`mt-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${step.same ? 'border-green-500/50 bg-green-500/10 text-green-200' : 'border-red-500/50 bg-red-500/10 text-red-200'}`}>
                                    {step.same ? <CheckCircle className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
                                    <span className="font-mono">{toIp(step.otherNet)} {step.same ? '=' : '≠'} {toIp(step.network)}</span>
                                    <span>→ {step.same ? 'same subnet, deliver directly' : 'different subnets, send to the gateway'}</span>
                                </div>
                            )}

                            {sh.ruler && (
                                <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                                    <BlockRuler step={step} />
                                </div>
                            )}
                        </div>

                        {predict.prompt && <PredictPrompt predict={predict} accent="pink" />}

                        <div className="bg-pink-500/10 border border-pink-500/20 rounded-lg p-4">
                            <div className="flex items-start gap-2">
                                <Info className="h-4 w-4 text-pink-400 mt-0.5 flex-shrink-0" />
                                <p className="text-pink-200 text-sm leading-relaxed">
                                    {predict.hideExplanation ? 'Make your prediction above to reveal this step.' : step.explanation}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Binary className="h-5 w-5 text-pink-400" />
                                <h3 className="font-bold text-white">Prefix Cheat Sheet</h3>
                            </div>
                            <div className="space-y-1 text-xs font-mono">
                                {[8, 16, 20, 24, 26, 27, 28, 29, 30, 31, 32].map(p => {
                                    const usable = p === 32 ? 1 : p === 31 ? 2 : 2 ** (32 - p) - 2;
                                    return (
                                        <div key={p} className={`grid grid-cols-[3rem_1fr_auto] gap-2 px-2 py-1 rounded ${p === step.prefix ? 'bg-pink-500/15 text-pink-200' : 'text-slate-400'}`}>
                                            <span>/{p}</span>
                                            <span>{toIp(maskOf(p))}</span>
                                            {/* hidden while a prediction is open — it would answer the host-count question */}
                                            <span className="text-right">{predict.hideExplanation ? '— hosts' : `${usable.toLocaleString()} hosts`}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">Knowledge Check</h3>
                            <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <button onClick={() => setShowCode(c => !c)} className="flex items-center gap-2 text-pink-400 hover:text-pink-300 font-medium">
                                <Code2 className="h-5 w-5" />{showCode ? 'Hide' : 'Show'} Python: the ipaddress module
                            </button>
                            {showCode && <div className="mt-4"><CodeBlock code={codeExample} language="python" /></div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
