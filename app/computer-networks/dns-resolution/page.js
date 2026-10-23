"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, RotateCcw, SkipForward, SkipBack, Shuffle, Info, Code2, Database, Clock,
} from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── The namespace ───────────────────────────────────────────────────────────
   Two zones under two TLDs. Addresses are from the documentation ranges
   (RFC 5737); TTLs are typical of real records. */
const RECORDS = {
    'www.example.com':  { ip: '203.0.113.10', ttl: 300 },
    'mail.example.com': { ip: '203.0.113.25', ttl: 3600 },
    'api.example.com':  { ip: '203.0.113.40', ttl: 60 },
    'www.example.org':  { ip: '198.51.100.7', ttl: 600 },
    'docs.example.org': { ip: '198.51.100.9', ttl: 120 },
};
const NAMES = Object.keys(RECORDS);
const TLDS = {
    com: { server: 'tld-com', ns: 'a.gtld-servers.net', ttl: 172800 },
    org: { server: 'tld-org', ns: 'a0.org.afilias-nst.info', ttl: 172800 },
};
const ZONES = {
    'example.com': { server: 'auth-com', ns: 'ns1.example.com', ttl: 172800 },
    'example.org': { server: 'auth-org', ns: 'ns1.example.org', ttl: 86400 },
};
/* Round-trip times from the recursive resolver (and from the stub to it). */
const RTT = { stub: 4, root: 18, 'tld-com': 26, 'tld-org': 28, 'auth-com': 34, 'auth-org': 31 };

const zoneOf = (q) => q.split('.').slice(-2).join('.');
const tldOf = (q) => q.split('.').slice(-1)[0];

const PRESETS = [
    { id: 'warm',  label: 'Cold, warm, expired', lookups: [
        { name: 'www.example.com', at: 0 }, { name: 'www.example.com', at: 40 }, { name: 'mail.example.com', at: 45 },
        { name: 'www.example.com', at: 400 }, { name: 'www.example.org', at: 410 }] },
    { id: 'short', label: 'A 60-second TTL', lookups: [
        { name: 'api.example.com', at: 0 }, { name: 'api.example.com', at: 30 }, { name: 'api.example.com', at: 90 },
        { name: 'www.example.com', at: 95 }] },
    { id: 'days',  label: 'Days later', lookups: [
        { name: 'www.example.org', at: 0 }, { name: 'docs.example.org', at: 60 }, { name: 'www.example.org', at: 90000 },
        { name: 'www.example.org', at: 260000 }] },
];

const fmtSecs = (s) => {
    if (s < 1000) return `${s} s`;
    if (s < 7200) return `${Math.round(s / 60)} min`;
    if (s < 172800) return `${Math.round(s / 3600)} h`;
    return `${(s / 86400).toFixed(1)} d`;
};

const SERVER_NAME = (id) => ({
    root: 'a root server',
    'tld-com': 'the .com TLD server', 'tld-org': 'the .org TLD server',
    'auth-com': 'ns1.example.com', 'auth-org': 'ns1.example.org',
}[id]);

function generateSteps(lookups) {
    const steps = [];
    const cache = [];
    let clock = 0;
    const find = (key) => cache.find(e => e.key === key);
    const fresh = (key, now) => { const e = find(key); return e && e.storedAt + e.ttl > now ? e : null; };
    const put = (name, type, value, ttl, now) => {
        const key = `${name}|${type}`;
        const i = cache.findIndex(e => e.key === key);
        const entry = { key, name, type, value, ttl, storedAt: now };
        if (i >= 0) cache[i] = entry; else cache.push(entry);
        return key;
    };
    const snap = (extra) => steps.push({ cache: cache.map(e => ({ ...e })), clock, highlight: [], newKeys: [], msg: null, ...extra });

    snap({ phase: 'intro', token: 'stub', lookupIdx: -1,
        explanation: 'A laptop, its configured recursive resolver, and the servers that hold the DNS namespace: one root, a server for each top-level domain, and an authoritative server for each zone. The resolver starts with an empty cache — all it knows is the root servers\' addresses, the "root hints" compiled into it.' });

    lookups.forEach((lk, li) => {
        const q = lk.name;
        const zone = zoneOf(q), tld = tldOf(q);
        clock = lk.at;
        const aKey = `${q}|A`, zoneKey = `${zone}|NS`, tldKey = `${tld}|NS`;

        snap({ phase: 'ask', token: 'rec', lookupIdx: li, qname: q,
            msg: { from: 'stub', to: 'rec', label: `A? ${q}  (recursion desired)`, kind: 'query' },
            explanation: `Lookup ${li + 1}, at t = ${fmtSecs(clock)}: an application asks the operating system for ${q}. The stub resolver does no work of its own — it sends one query, with the "recursion desired" flag set, to the recursive resolver and waits for a final answer.` });

        let startAt;
        const a = fresh(aKey, clock), zns = fresh(zoneKey, clock), tns = fresh(tldKey, clock);
        const stale = [aKey, zoneKey, tldKey].map(find).filter(e => e && e.storedAt + e.ttl <= clock);
        const staleNote = stale.length
            ? ` (${stale.map(e => `${e.name} ${e.type} expired ${fmtSecs(clock - e.storedAt - e.ttl)} ago`).join('; ')}, so ${stale.length > 1 ? 'they are' : 'it is'} useless now.)`
            : '';
        let checkText;
        if (a) {
            startAt = 'cache';
            checkText = `The resolver finds ${q} A ${a.value} in its cache with ${fmtSecs(a.storedAt + a.ttl - clock)} of its TTL left. It can answer without sending a single packet upstream.`;
        } else if (zns) {
            startAt = ZONES[zone].server;
            checkText = `No usable A record for ${q}.${staleNote} But it does hold ${zone}'s NS record, valid for ${fmtSecs(zns.storedAt + zns.ttl - clock)} more — so it skips the root and the .${tld} server and asks ${ZONES[zone].ns} directly.`;
        } else if (tns) {
            startAt = TLDS[tld].server;
            checkText = `Nothing cached for ${q} or ${zone}.${staleNote} It does still know the .${tld} servers (${fmtSecs(tns.storedAt + tns.ttl - clock)} left on that referral), so the walk starts at the TLD, not the root.`;
        } else {
            startAt = 'root';
            checkText = `Nothing useful in the cache for ${q}.${staleNote} The only place to start is the root.`;
        }
        snap({ phase: 'check', token: 'rec', lookupIdx: li, qname: q, startAt, highlight: [aKey, zoneKey, tldKey].filter(k => find(k)),
            explanation: checkText });

        let elapsed = RTT.stub;
        const chain = startAt === 'cache' ? []
            : startAt === 'root' ? ['root', TLDS[tld].server, ZONES[zone].server]
            : startAt === TLDS[tld].server ? [TLDS[tld].server, ZONES[zone].server]
            : [ZONES[zone].server];
        const path = [];
        for (const server of chain) {
            path.push(server);
            snap({ phase: 'query', token: server, lookupIdx: li, qname: q, path: [...path],
                msg: { from: 'rec', to: server, label: `A? ${q}`, kind: 'query' },
                explanation: server === 'root'
                    ? `The resolver asks a root server for ${q}. Root servers know nothing about example domains — only which servers run each TLD.`
                    : server.startsWith('tld')
                        ? `The resolver repeats the very same question to the .${tld} server: "A? ${q}". It is always the full name; each server answers with as much as it knows.`
                        : `The resolver asks ${ZONES[zone].ns}, the server that is authoritative for ${zone}.` });
            elapsed += RTT[server];
            let key, label, kind, text;
            if (server === 'root') {
                key = put(tld, 'NS', TLDS[tld].ns, TLDS[tld].ttl, clock);
                label = `referral: ${tld}. NS ${TLDS[tld].ns}`; kind = 'referral';
                text = `The root replies with a referral, not an answer: "I don't know ${q}, but the .${tld} zone is served by ${TLDS[tld].ns}", plus that server's address as glue. The resolver caches the referral for ${fmtSecs(TLDS[tld].ttl)}.`;
            } else if (server.startsWith('tld')) {
                key = put(zone, 'NS', ZONES[zone].ns, ZONES[zone].ttl, clock);
                label = `referral: ${zone}. NS ${ZONES[zone].ns}`; kind = 'referral';
                text = `Another referral: ${zone} is delegated to ${ZONES[zone].ns}. Cached for ${fmtSecs(ZONES[zone].ttl)} — which is what lets every later ${zone} lookup skip the first two steps.`;
            } else {
                key = put(q, 'A', RECORDS[q].ip, RECORDS[q].ttl, clock);
                label = `${q}. A ${RECORDS[q].ip}  TTL ${RECORDS[q].ttl}  (authoritative)`; kind = 'answer';
                text = `The authoritative server answers: ${q} has address ${RECORDS[q].ip}, TTL ${RECORDS[q].ttl} seconds, with the "authoritative answer" flag set. The TTL is the zone owner's instruction to everyone downstream: cache this for at most ${fmtSecs(RECORDS[q].ttl)}.`;
            }
            snap({ phase: 'reply', token: 'rec', lookupIdx: li, qname: q, path: [...path], newKeys: [key],
                msg: { from: server, to: 'rec', label, kind }, explanation: text });
        }

        const ans = find(aKey);
        const left = ans.storedAt + ans.ttl - clock;
        snap({ phase: 'answer', token: 'stub', lookupIdx: li, qname: q, path: [...path], startAt, elapsed, highlight: [aKey],
            msg: { from: 'rec', to: 'stub', label: `A ${ans.value}  TTL ${left}`, kind: 'answer' },
            explanation: startAt === 'cache'
                ? `Answered from cache in about ${elapsed} ms — just the hop from the laptop to the resolver. The TTL handed back is the ${left} seconds remaining, not the original ${ans.ttl}, so no cache downstream can hold the record longer than the owner allowed.`
                : `The resolver returns ${ans.value} to the stub, about ${elapsed} ms after the question was asked, having made ${chain.length} upstream ${chain.length > 1 ? 'queries' : 'query'}. The stub — and the browser above it — may cache it too, for at most ${left} seconds.` });
    });

    const last = steps[steps.length - 1];
    snap({ phase: 'summary', token: 'stub', lookupIdx: lookups.length, path: [],
        explanation: `${lookups.length} lookups done. Every referral and answer the resolver ever received is in its cache with its own clock. A popular resolver answers most queries this way; the root and TLD servers see a tiny fraction of the world's lookups, because their referrals live for days.`, elapsed: last.elapsed });
    return steps;
}

/* Before the resolver checks its cache, the screen shows that cache with each
   entry's remaining TTL at the current clock — enough to say where the walk
   starts. Not asked while the cache is still empty, where "the root" is the
   only possible answer. The four places it can start are rotated by the
   lookup number and the name's length, so no button position is favoured. */
const predictFor = (step, next) => {
    if (!step || !next || step.phase !== 'ask' || next.phase !== 'check') return null;
    if (!step.cache.length) return null;
    const q = step.qname, tld = tldOf(q), zone = zoneOf(q);
    const hierarchy = [
        { id: 'cache', label: 'Answers straight from its cache' },
        { id: 'root', label: 'A root server' },
        { id: TLDS[tld].server, label: `The .${tld} TLD server` },
        { id: ZONES[zone].server, label: `${ZONES[zone].ns} (authoritative)` },
    ];
    const r = (step.lookupIdx + q.length) % hierarchy.length;
    const opts = [...hierarchy.slice(r), ...hierarchy.slice(0, r)];
    const correct = opts.findIndex(o => o.id === next.startAt);
    return {
        question: `The resolver's clock reads t = ${fmtSecs(step.clock)}. Looking at its cache, where does it go first for ${q}?`,
        options: opts.map(o => o.label),
        correct,
        because: next.startAt === 'cache'
            ? `${q}'s A record is cached and its TTL has not run out, so no upstream query is needed.`
            : next.startAt === 'root'
                ? `Nothing still valid covers ${q} — no A record, no NS for ${zone}, no NS for .${tld} — so only the root hints are left.`
                : next.startAt.startsWith('tld')
                    ? `The A record and ${zone}'s NS record are missing or expired, but the .${tld} referral is still valid, so the walk starts one level down.`
                    : `The A record is missing or expired, but ${zone}'s NS record is still valid, so the resolver asks the authoritative server directly.`,
    };
};

/* Random lookups. A uniformly random sequence mostly shows two things —
   cold walks from the root and jumps straight to an authoritative server —
   because cache hits need a repeated name and TLD starts need a narrow time
   window. So draw several and keep the one where the resolver starts in the
   most different places, as evenly as possible. */
function randomLookups(rand = Math.random) {
    const gaps = [5, 20, 45, 90, 200, 400, 1800, 4000, 90000, 200000];
    const draw = () => {
        let t = 0;
        return Array.from({ length: 4 + Math.floor(rand() * 2) }, (_, i) => {
            if (i) t += gaps[Math.floor(rand() * gaps.length)];
            return { name: NAMES[Math.floor(rand() * NAMES.length)], at: t };
        });
    };
    let best = null, bestScore = -Infinity;
    for (let k = 0; k < 30; k++) {
        const lookups = draw();
        const steps = generateSteps(lookups);
        const counts = {};
        steps.forEach((s, i) => {
            if (predictFor(s, steps[i + 1])) {
                const kind = steps[i + 1].startAt.split('-')[0];
                counts[kind] = (counts[kind] ?? 0) + 1;
            }
        });
        const score = Object.keys(counts).length * 10 - Math.max(0, ...Object.values(counts));
        if (score > bestScore) { bestScore = score; best = lookups; }
    }
    return best;
}

const quizQuestions = [
    {
        question: 'Who walks the hierarchy from the root to the authoritative server during a normal lookup?',
        options: [
            'The browser',
            'The stub resolver in the operating system',
            'The recursive resolver, on the stub\'s behalf',
            'The root server forwards the query down the tree',
        ],
        correct: 2,
        explanation: 'The stub sends one recursive query and waits. The recursive resolver does the iterative work: it asks the root, follows the referral to the TLD, follows that to the authoritative server, and caches everything along the way. Root and TLD servers only ever refer — they never forward a query themselves.',
    },
    {
        question: 'A resolver cached www.example.com A 203.0.113.10 with TTL 300 at t = 0. Another client asks for it at t = 200. What happens?',
        options: [
            'The resolver re-queries the authoritative server, because a new client asked',
            'It answers from cache and passes on a TTL of 100',
            'It answers from cache and passes on a TTL of 300',
            'It must re-query because 200 seconds is more than half the TTL',
        ],
        correct: 1,
        explanation: 'The record is still valid for 300 − 200 = 100 seconds, so it is served from cache — and the TTL is counted down, so downstream caches can keep it only until the original expiry. Resolvers do not reset TTLs for new clients.',
    },
    {
        question: 'Why do root servers handle only a small share of the world\'s DNS lookups?',
        options: [
            'Most domains are registered without the root',
            'Resolvers cache the TLD referrals for up to two days, so they rarely need to ask the root again',
            'Browsers query TLD servers directly',
            'Root servers drop most queries on purpose',
        ],
        correct: 1,
        explanation: 'A resolver asks the root only when it holds no valid referral for the TLD. Those referrals carry long TTLs (two days for .com), so after the first lookup a busy resolver goes straight to the TLD or the authoritative server. Anycast spreads the remaining load across hundreds of root-server instances.',
    },
];

function QuizPanel({ quizState, setQuizState }) {
    const q = quizQuestions[quizState.current];
    if (quizState.complete) {
        return (
            <div className="text-center py-2">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{quizQuestions.length}</div>
                <div className="text-pink-300/80 text-sm mb-4">{quizState.score === quizQuestions.length ? 'Perfect — you can read dig +trace.' : 'Replay the second and fourth lookups and retry.'}</div>
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

// ── Stage ─────────────────────────────────────────────────────────────────────
const NODES = {
    stub:       { x: 70,  y: 200, title: 'your laptop',       sub: 'stub resolver' },
    rec:        { x: 250, y: 200, title: 'recursive resolver', sub: 'ISP or 1.1.1.1' },
    root:       { x: 580, y: 52,  title: 'root  .',            sub: 'a.root-servers.net' },
    'tld-com':  { x: 480, y: 178, title: '.com TLD',           sub: 'a.gtld-servers.net' },
    'tld-org':  { x: 680, y: 178, title: '.org TLD',           sub: 'a0.org.afilias-nst.info' },
    'auth-com': { x: 480, y: 304, title: 'example.com',        sub: 'ns1.example.com' },
    'auth-org': { x: 680, y: 304, title: 'example.org',        sub: 'ns1.example.org' },
};
const NW = 136, NH = 46;
const KIND_COLOR = { query: '#f472b6', referral: '#fbbf24', answer: '#4ade80' };

function DnsStage({ step }) {
    const tok = NODES[step.token];
    const msg = step.msg;
    const active = msg ? [msg.from, msg.to] : [];
    const onPath = new Set(step.path || []);
    const edge = (a, b, extra = {}) => {
        const A = NODES[a], B = NODES[b];
        const on = msg && ((msg.from === a && msg.to === b) || (msg.from === b && msg.to === a));
        return <line key={`${a}-${b}`} x1={A.x} y1={A.y} x2={B.x} y2={B.y}
            stroke={on ? KIND_COLOR[msg.kind] : '#1e293b'} strokeWidth={on ? 2.2 : 1.4}
            className={on ? 'd-flow' : ''} {...extra} />;
    };
    return (
        <svg viewBox="0 0 760 380" width="100%" className="select-none">
            <style>{`
                .d-box { transition: fill .4s ease, stroke .4s ease; }
                .d-tok { transition: transform .7s cubic-bezier(.45,0,.15,1); }
                .d-flow { stroke-dasharray: 7 6; animation: dnsflow .6s linear infinite; }
                @keyframes dnsflow { to { stroke-dashoffset: -26; } }
            `}</style>
            {/* delegation tree */}
            {[['root', 'tld-com'], ['root', 'tld-org'], ['tld-com', 'auth-com'], ['tld-org', 'auth-org']].map(([a, b]) => (
                <line key={`t-${a}-${b}`} x1={NODES[a].x} y1={NODES[a].y + NH / 2} x2={NODES[b].x} y2={NODES[b].y - NH / 2}
                    stroke="#334155" strokeWidth="1" strokeDasharray="2 4" />
            ))}
            {edge('stub', 'rec')}
            {['root', 'tld-com', 'tld-org', 'auth-com', 'auth-org'].map(s => edge('rec', s))}

            {Object.entries(NODES).map(([id, n]) => {
                const on = active.includes(id);
                const visited = onPath.has(id);
                return (
                    <g key={id}>
                        <rect x={n.x - NW / 2} y={n.y - NH / 2} width={NW} height={NH} rx="9" className="d-box"
                            fill={on ? '#2a1424' : '#0f172a'} stroke={on ? '#f472b6' : visited ? '#9d174d' : '#334155'} strokeWidth={on ? 2.2 : 1.3} />
                        <text x={n.x} y={n.y - 3} textAnchor="middle" fontSize="11" fontWeight="700" fill={on ? '#fce7f3' : '#cbd5e1'}>{n.title}</text>
                        <text x={n.x} y={n.y + 13} textAnchor="middle" fontSize="8.5" fill="#64748b" fontFamily="monospace">{n.sub}</text>
                    </g>
                );
            })}

            <g className="d-tok" style={{ transform: `translate(${tok.x}px, ${tok.y - NH / 2 - 12}px)` }}>
                <rect x={-16} y={-9} width={32} height={18} rx="5" fill="#0f172a" stroke={msg ? KIND_COLOR[msg.kind] : '#64748b'} strokeWidth="1.8" />
                <text y={4} textAnchor="middle" fontSize="9" fontWeight="700" fill={msg ? KIND_COLOR[msg.kind] : '#94a3b8'} fontFamily="monospace">
                    {msg ? (msg.kind === 'query' ? 'Q' : msg.kind === 'referral' ? 'REF' : 'ANS') : '·'}
                </text>
            </g>

            {msg && (
                <g>
                    <rect x={20} y={334} width={720} height={30} rx="8" fill="#020617" stroke="#1e293b" />
                    <text x={34} y={353} fontSize="10" fill="#64748b" fontFamily="monospace">
                        {NODES[msg.from].title} → {NODES[msg.to].title}:
                    </text>
                    <text x={250} y={353} fontSize="10.5" fontWeight="700" fill={KIND_COLOR[msg.kind]} fontFamily="monospace">{msg.label}</text>
                </g>
            )}
        </svg>
    );
}

function CacheTable({ step }) {
    if (!step.cache.length) {
        return <p className="text-xs text-slate-600 font-mono">Resolver cache is empty — only the root hints are known.</p>;
    }
    return (
        <div className="font-mono text-[11px]">
            <div className="grid grid-cols-[1.6fr_0.5fr_1.6fr_1.1fr] gap-2 px-2 pb-1 text-[10px] text-slate-600">
                <span>name</span><span>type</span><span>value</span><span className="text-right">TTL left</span>
            </div>
            {step.cache.map(e => {
                const left = e.storedAt + e.ttl - step.clock;
                const isNew = step.newKeys.includes(e.key);
                const hot = step.highlight.includes(e.key);
                return (
                    <div key={e.key} className={`grid grid-cols-[1.6fr_0.5fr_1.6fr_1.1fr] gap-2 px-2 py-1 rounded transition-colors ${
                        isNew ? 'bg-green-500/15 text-green-200' : hot ? 'bg-pink-500/15 text-pink-100' : 'text-slate-300'}`}>
                        <span className="truncate">{e.name}</span>
                        <span className="text-slate-500">{e.type}</span>
                        <span className="truncate">{e.value}</span>
                        <span className={`text-right ${left > 0 ? 'text-slate-400' : 'text-red-400'}`}>
                            {left > 0 ? fmtSecs(left) : `expired ${fmtSecs(-left)} ago`}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

const codeExample = `import dns.flags, dns.message, dns.query, dns.rdatatype   # pip install dnspython

ROOT = '198.41.0.4'                       # a.root-servers.net, from the root hints

def resolve(name, server=ROOT):
    """Walk the hierarchy by hand, the way a recursive resolver does."""
    while True:
        query = dns.message.make_query(name, dns.rdatatype.A)
        query.flags &= ~dns.flags.RD      # iterative: do not ask them to recurse
        reply = dns.query.udp(query, server, timeout=3)

        if reply.answer:                  # the authoritative server answered
            rrset = reply.answer[-1]
            return [r.address for r in rrset], rrset.ttl

        # A referral: NS records in AUTHORITY, their addresses (glue) in ADDITIONAL.
        zone = reply.authority[0].name
        glue = [r.address for rrset in reply.additional
                for r in rrset if rrset.rdtype == dns.rdatatype.A]
        print(f'{server:>15} -> referral to {zone}')
        server = glue[0]                  # ask the next server down the tree

print(resolve('www.example.com'))`;

export default function DnsResolutionPage() {
    const [preset, setPreset] = useState(PRESETS[0]);
    const [lookups, setLookups] = useState(PRESETS[0].lookups);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1200);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const stepHistory = useMemo(() => generateSteps(lookups), [lookups]);

    useEffect(() => {
        if (!isPlaying) return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const pauseForPredict = useCallback(() => setIsPlaying(false), []);
    const predict = usePredict(stepHistory, currentStep, predictFor, pauseForPredict);
    const step = stepHistory[Math.min(currentStep, stepHistory.length - 1)];

    const restart = () => { setCurrentStep(0); setIsPlaying(false); predict.reset(); };
    const applyPreset = (p) => { setPreset(p); setLookups(p.lookups); restart(); };
    const shuffle = () => { setPreset(null); setLookups(randomLookups()); restart(); };

    const jumpTo = (li) => { const i = stepHistory.findIndex(s => s.lookupIdx === li); if (i >= 0) { setCurrentStep(i); setIsPlaying(false); } };

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-pink-500 to-rose-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/computer-networks" className="flex items-center text-white hover:text-pink-100 transition-colors mb-6 w-fit">
                        <ArrowLeft className="h-5 w-5 mr-2" />Back to Computer Networks
                    </Link>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">DNS Resolution</h1>
                        <p className="text-lg text-pink-100 mb-6 max-w-3xl mx-auto">
                            One question, asked of the root, a TLD and an authoritative server in turn — and then, for as long as
                            the TTL allows, not asked at all.
                        </p>
                        <div className="flex flex-wrap justify-center gap-3 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Cold: 3 upstream queries</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Warm: 0</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Cache bounded by TTL</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
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
                                    <Shuffle size={18} />Random lookups
                                </button>
                                <PredictToggle predict={predict} accent="pink" />
                            </div>

                            <div className="flex flex-wrap items-center gap-2 mb-4">
                                <span className="text-xs text-slate-500 mr-1">Scenario</span>
                                {PRESETS.map(p => (
                                    <button key={p.id} onClick={() => applyPreset(p)}
                                        className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${preset?.id === p.id ? 'bg-pink-500/20 border-pink-500/60 text-pink-200' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-pink-500/60'}`}>{p.label}</button>
                                ))}
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2 text-slate-300">Animation Speed: {speed}ms</label>
                                <input type="range" min="200" max="2000" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-full max-w-md accent-pink-500" />
                            </div>

                            {/* Lookup timeline */}
                            <div className="flex flex-wrap gap-1.5 mb-3">
                                {lookups.map((lk, i) => (
                                    <button key={i} onClick={() => jumpTo(i)}
                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-colors ${step.lookupIdx === i
                                            ? 'bg-pink-500/20 border-pink-500/50 text-pink-200'
                                            : step.lookupIdx > i ? 'bg-slate-800/60 border-slate-700 text-slate-400' : 'border-slate-800 text-slate-600 hover:text-slate-400'}`}>
                                        t={fmtSecs(lk.at)} · {lk.name}
                                    </button>
                                ))}
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-1.5 mb-4">
                                <div className="bg-pink-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${((currentStep + 1) / stepHistory.length) * 100}%` }} />
                            </div>

                            <div className="bg-slate-950/60 rounded-lg border border-slate-800 p-2">
                                <DnsStage step={step} />
                            </div>

                            <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-300"><Database className="h-3.5 w-3.5 text-pink-400" />Resolver cache</span>
                                    <span className="flex items-center gap-1.5 text-xs font-mono text-slate-400"><Clock className="h-3.5 w-3.5" />t = {fmtSecs(step.clock)}</span>
                                </div>
                                <CacheTable step={step} />
                            </div>
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
                            <h3 className="font-bold text-white mb-3">Lookups So Far</h3>
                            <div className="space-y-1.5 text-xs">
                                {lookups.map((lk, i) => {
                                    const done = stepHistory.find(s => s.lookupIdx === i && s.phase === 'answer');
                                    const reached = step.lookupIdx > i || (step.lookupIdx === i && step.phase === 'answer');
                                    return (
                                        <div key={i} className={`flex justify-between gap-2 px-2 py-1.5 rounded-lg ${step.lookupIdx === i ? 'bg-pink-500/15 text-pink-200' : 'text-slate-400'}`}>
                                            <span className="font-mono truncate">{lk.name}</span>
                                            <span className="font-mono text-[10px] shrink-0">
                                                {reached ? `${done.startAt === 'cache' ? 'cache' : `${done.path.length} quer${done.path.length > 1 ? 'ies' : 'y'}`} · ${done.elapsed} ms` : '—'}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
                                Round trips here: {RTT.stub} ms to the resolver, {RTT.root} ms to a root, about 27 ms to a TLD and about 32 ms to an authoritative server.
                            </p>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">Knowledge Check</h3>
                            <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <button onClick={() => setShowCode(c => !c)} className="flex items-center gap-2 text-pink-400 hover:text-pink-300 font-medium">
                                <Code2 className="h-5 w-5" />{showCode ? 'Hide' : 'Show'} Python: walk the hierarchy yourself
                            </button>
                            {showCode && <div className="mt-4"><CodeBlock code={codeExample} language="python" /></div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
