"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, RotateCcw, SkipForward, SkipBack, Shuffle, Info, Code2, Cable, Table,
} from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── The LAN ─────────────────────────────────────────────────────────────────
   Four hosts on one switch, all in 10.0.0.0/24. The switch forgets a MAC
   300 s after last seeing it (the IEEE 802.1D default); in this lab hosts keep
   ARP entries for 20 minutes — longer than the switch, as is common. */
const HOSTS = [
    { id: 'H1', ip: '10.0.0.1', mac: 'aa:aa:aa:00:00:01', port: 1, pos: [92, 62] },
    { id: 'H2', ip: '10.0.0.2', mac: 'aa:aa:aa:00:00:02', port: 2, pos: [668, 62] },
    { id: 'H3', ip: '10.0.0.3', mac: 'aa:aa:aa:00:00:03', port: 3, pos: [92, 318] },
    { id: 'H4', ip: '10.0.0.4', mac: 'aa:aa:aa:00:00:04', port: 4, pos: [668, 318] },
];
const BCAST = 'ff:ff:ff:ff:ff:ff';
const MAC_AGING = 300;
const ARP_TTL = 1200;
const host = (id) => HOSTS.find(h => h.id === id);
const byMac = (mac) => HOSTS.find(h => h.mac === mac);
const short = (mac) => (mac === BCAST ? 'ff:…:ff' : `…:${mac.slice(-2)}`);

const PRESETS = [
    { id: 'first', label: 'First contact', events: [{ from: 'H1', to: 'H3', at: 0 }, { from: 'H3', to: 'H1', at: 2 }, { from: 'H2', to: 'H3', at: 5 }] },
    { id: 'aged',  label: 'Switch table ages out', events: [{ from: 'H1', to: 'H2', at: 0 }, { from: 'H1', to: 'H2', at: 400 }, { from: 'H2', to: 'H1', at: 405 }] },
    { id: 'busy',  label: 'Everyone talks', events: [{ from: 'H1', to: 'H2', at: 0 }, { from: 'H3', to: 'H4', at: 1 }, { from: 'H4', to: 'H1', at: 2 }, { from: 'H2', to: 'H4', at: 3 }] },
    { id: 'reboot', label: 'Switch just restarted', warmArp: true, events: [{ from: 'H1', to: 'H3', at: 0 }, { from: 'H3', to: 'H1', at: 1 }, { from: 'H2', to: 'H3', at: 2 }, { from: 'H4', to: 'H2', at: 3 }] },
];

/* `warmArp`: the hosts were already talking when the switch restarted, so
   their ARP caches are full while its MAC table is empty. */
function generateSteps(events, { warmArp = false } = {}) {
    const steps = [];
    const table = {};                                  // mac -> { port, seen }
    const arp = Object.fromEntries(HOSTS.map(h => [h.id, {}]));   // ip -> { mac, at, how }
    if (warmArp) {
        for (const h of HOSTS) for (const o of HOSTS) if (o.id !== h.id) arp[h.id][o.ip] = { mac: o.mac, at: -120, how: 'warm' };
    }
    /* MACs the switch has already forwarded a data frame to since it last
       (re)learned them: after the first, "forward" stops being news. */
    const taught = new Set();
    /* An ARP reply is always forwarded — the request it answers has just
       taught the switch the asker's port — so that is asked once per run. */
    let replyAsked = false;
    let t = 0;
    const tableView = () => Object.entries(table).map(([mac, e]) => ({ mac, port: e.port, host: byMac(mac).id, age: t - e.seen })).sort((a, b) => a.port - b.port);
    const arpView = () => Object.fromEntries(HOSTS.map(h => [h.id, Object.entries(arp[h.id]).map(([ip, e]) => ({ ip, mac: e.mac, host: byMac(e.mac).id, age: t - e.at }))]));
    let cur = {};                                     // the event in progress: who is sending to whom
    const snap = (extra) => steps.push({ t, table: tableView(), arp: arpView(), frames: [], learned: null, decision: null, ...cur, ...extra });
    const learn = (mac, port) => {
        const isNew = !table[mac];
        table[mac] = { port, seen: t };
        if (isNew) taught.delete(mac);
        return isNew;
    };

    snap({ phase: 'intro', ei: -1,
        explanation: warmArp
            ? 'Four hosts on one Ethernet switch, all in 10.0.0.0/24. They were already talking to each other, so every ARP cache is full — but the switch has just restarted and its MAC table is empty. Watch what happens to frames whose destination it has not heard from yet.'
            : 'Four hosts on one Ethernet switch, all in 10.0.0.0/24. IP addresses are how the hosts name each other, but a frame on this LAN is delivered by MAC address — so before sending, a host has to find out the MAC behind an IP (ARP). The switch, meanwhile, starts knowing nothing about which MAC sits on which port.' });

    events.forEach((ev, ei) => {
        t = ev.at;
        const src = host(ev.from), dst = host(ev.to);
        cur = { src: src.id, dst: dst.id };
        const agedMacs = Object.entries(table).filter(([, e]) => t - e.seen >= MAC_AGING).map(([m]) => byMac(m).id);
        for (const [m, e] of Object.entries(table)) if (t - e.seen >= MAC_AGING) delete table[m];
        let agedArp = 0;
        for (const h of HOSTS) for (const [ip, e] of Object.entries(arp[h.id])) if (t - e.at >= ARP_TTL) { delete arp[h.id][ip]; agedArp++; }
        const agedNote = agedMacs.length
            ? ` (Since the last frame, ${MAC_AGING} seconds have passed without the switch hearing from ${agedMacs.join(', ')}, so ${agedMacs.length > 1 ? 'those entries have' : 'that entry has'} aged out of its table.)`
            : '';
        /* Asked whenever the cache is cold or expired. On a warm cache only
           when the entry is not one the sender fetched itself moments ago:
           picked up passively (as the target of a request, or before the
           restart) or sitting there for 300 s or more. */
        const entry = arp[src.id][dst.ip];
        const askArp = !entry || entry.how !== 'asked' || t - entry.at >= 300;
        snap({ phase: 'arp-check', ei, askArp,
            explanation: `t = ${t} s: ${src.id} (${src.ip}) has an IP packet for ${dst.ip}. That address is on its own subnet, so the frame goes straight to ${dst.id} — addressed to ${dst.id}'s MAC, which ${src.id} looks up in its ARP cache.${agedNote}${agedArp ? ` ${agedArp} ARP entr${agedArp > 1 ? 'ies have' : 'y has'} expired too.` : ''}` });

        const unicastOut = (frame, outcomeFor) => {
            const known = table[frame.dstMac];
            const inPort = host(frame.from).port;
            const targets = known ? [byMac(frame.dstMac)] : HOSTS.filter(h => h.port !== inPort);
            return { decision: known ? 'forward' : 'flood', frames: targets.map(h => ({ ...frame, dir: 'out', to: h.id, outcome: outcomeFor(h) })) };
        };

        if (!arp[src.id][dst.ip]) {
            // ARP request, broadcast
            const req = { kind: 'arp-req', from: src.id, srcMac: src.mac, dstMac: BCAST, label: `who has ${dst.ip}?` };
            const wasNew = learn(src.mac, src.port);
            snap({ phase: 'frame-in', ei, frame: req, frames: [{ ...req, dir: 'in' }], learned: src.mac,
                explanation: `Cache miss. ${src.id} broadcasts an ARP request: "who has ${dst.ip}? tell ${src.ip}", sent to ${BCAST}. The switch reads the frame's source MAC first and ${wasNew ? 'learns' : 'refreshes'} that ${short(src.mac)} lives on port ${src.port}.` });
            const outs = HOSTS.filter(h => h.port !== src.port).map(h => {
                let outcome;
                if (h.id === dst.id) { arp[h.id][src.ip] = { mac: src.mac, at: t, how: 'target' }; outcome = 'reply'; }
                else if (arp[h.id][src.ip]) { arp[h.id][src.ip] = { ...arp[h.id][src.ip], mac: src.mac, at: t }; outcome = 'refresh'; }
                else outcome = 'ignore';
                return { ...req, dir: 'out', to: h.id, outcome };
            });
            snap({ phase: 'frame-out', ei, frame: req, frames: outs, decision: 'flood',
                explanation: `A broadcast always goes out every port except the one it came in on. Every host reads it; only ${dst.id} owns ${dst.ip}. ${dst.id} records ${src.id}'s MAC from the request — it is about to need it — and the others ignore it${outs.some(o => o.outcome === 'refresh') ? ', apart from refreshing an entry they already had' : ''}.` });

            // ARP reply, unicast
            const rep = { kind: 'arp-rep', from: dst.id, srcMac: dst.mac, dstMac: src.mac, label: `${dst.ip} is at ${short(dst.mac)}` };
            const repNew = learn(dst.mac, dst.port);
            const askReply = !table[src.mac] || (!taught.has(src.mac) && !replyAsked);
            if (askReply) replyAsked = true;
            snap({ phase: 'frame-in', ei, frame: rep, frames: [{ ...rep, dir: 'in' }], learned: dst.mac, askSwitch: askReply,
                explanation: `${dst.id} answers with an ARP reply sent straight to ${src.id}'s MAC — a unicast frame, not a broadcast. On the way in the switch ${repNew ? 'learns' : 'refreshes'} that ${short(dst.mac)} is on port ${dst.port}.` });
            const outR = unicastOut(rep, h => (h.id === src.id ? 'accept' : 'drop'));
            arp[src.id][dst.ip] = { mac: dst.mac, at: t, how: 'asked' };
            snap({ phase: 'frame-out', ei, frame: rep, frames: outR.frames, decision: outR.decision,
                explanation: outR.decision === 'forward'
                    ? `The destination MAC ${short(src.mac)} is in the table on port ${src.port}, so the switch forwards the reply out that one port — no other host sees it. ${src.id} adds ${dst.ip} → ${short(dst.mac)} to its ARP cache.`
                    : `The switch has no entry for ${short(src.mac)}, so it floods the reply; the other hosts drop it because it is not addressed to them. ${src.id} adds ${dst.ip} → ${short(dst.mac)} to its ARP cache.` });
        }

        // the IP packet itself
        const data = { kind: 'data', from: src.id, srcMac: src.mac, dstMac: dst.mac, label: `IP → ${dst.ip}` };
        const dataNew = learn(src.mac, src.port);
        const cacheHit = steps[steps.length - 1].phase === 'arp-check';
        /* After an ARP exchange in this same event the reply has only just
           taught the switch where the destination is, so a forward is only
           asked about on a cache hit. */
        snap({ phase: 'frame-in', ei, frame: data, frames: [{ ...data, dir: 'in' }], learned: src.mac, askSwitch: !table[dst.mac] || (!taught.has(dst.mac) && cacheHit),
            explanation: `${cacheHit ? `Cache hit: ${src.id} already knows ${dst.ip} is at ${short(dst.mac)}, so no ARP is needed. ` : ''}${src.id} sends the IP packet in a frame addressed to ${short(dst.mac)}. The switch ${dataNew ? 'learns' : 'refreshes'} ${short(src.mac)} on port ${src.port} and looks up the destination.` });
        const outD = unicastOut(data, h => (h.id === dst.id ? 'accept' : 'drop'));
        if (outD.decision === 'forward') taught.add(dst.mac);
        snap({ phase: 'frame-out', ei, frame: data, frames: outD.frames, decision: outD.decision,
            explanation: outD.decision === 'forward'
                ? `${short(dst.mac)} is in the MAC table on port ${dst.port}: the switch forwards the frame out that port only. This is the normal case, and it is why a switch, unlike a hub, does not show every frame to every host.`
                : `${short(dst.mac)} is not in the MAC table${agedMacs.includes(dst.id) ? ' — it aged out, even though ' + src.id + '’s ARP cache still has it' : ''}, so the switch floods this unicast frame out every other port. ${dst.id} accepts it; the others drop it. The switch only learns where ${dst.id} is when ${dst.id} next sends something.` });
    });

    cur = {};
    snap({ phase: 'summary', ei: events.length,
        explanation: 'Two caches, two jobs. Each host\'s ARP cache maps IP to MAC so it can address frames; the switch\'s MAC table maps MAC to port so it can deliver them. Neither is configured — both are learned from traffic, and both forget, which is why a quiet host can suddenly cause a broadcast or a flood.' });
    return steps;
}

/* Two decisions the screen settles: whether the sender must ARP (its cache is
   on screen, with ages), and whether the switch floods or forwards a unicast
   frame (its MAC table is on screen, already updated with the frame's source).
   Left alone both answers are lopsided — most lookups miss a cold cache, and
   most unicast frames are forwarded — so the generator marks the steps worth
   asking (askArp, askSwitch), and the option order is rotated by the event
   and the port, neither of which says anything about the answer. */
const rotate = (arr, k) => { const r = k % arr.length; return [...arr.slice(r), ...arr.slice(0, r)]; };

const predictFor = (step, next) => {
    if (!step || !next) return null;
    if (step.phase === 'arp-check' && next.phase === 'frame-in' && step.askArp) {
        const src = host(step.src), dst = host(step.dst);
        const arps = next.frame.kind === 'arp-req';
        const opts = rotate([
            { label: 'Yes — broadcast an ARP request', yes: true },
            { label: `No — ${dst.ip} is already in its ARP cache`, yes: false },
        ], step.ei + src.port);
        return {
            question: `${src.id} wants to send to ${dst.ip}. Does it need to broadcast an ARP request first?`,
            options: opts.map(o => o.label),
            correct: opts.findIndex(o => o.yes === arps),
            because: arps
                ? `${src.id}'s ARP cache has no live entry for ${dst.ip}, so it cannot address the frame until it asks.`
                : `${src.id}'s cache already maps ${dst.ip} to ${short(dst.mac)} — and it has not expired, however it got there.`,
        };
    }
    if (step.phase === 'frame-in' && next.phase === 'frame-out' && step.frame.dstMac !== BCAST && step.askSwitch) {
        const target = byMac(step.frame.dstMac);
        const inPort = host(step.frame.from).port;
        const opts = rotate([
            { label: `Forward it only out port ${target.port}`, d: 'forward' },
            { label: `Flood it out every port except ${inPort}`, d: 'flood' },
        ], step.ei + inPort);
        return {
            question: `A ${step.frame.kind === 'data' ? 'data frame' : 'unicast ARP reply'} for ${short(step.frame.dstMac)} (${target.id}) arrives on port ${inPort}. What does the switch do with it?`,
            options: opts.map(o => o.label),
            correct: opts.findIndex(o => o.d === next.decision),
            because: next.decision === 'forward'
                ? `The switch's table has ${short(step.frame.dstMac)} on port ${target.port}, so it sends the frame there and nowhere else.`
                : `${short(step.frame.dstMac)} is not in the switch's table. You can see where ${target.id} is plugged in, but the switch cannot — it only knows ports it has heard a MAC on — so it floods.`,
        };
    }
    return null;
};

const quizQuestions = [
    {
        question: 'What destination MAC address does an ARP request use, and what about the reply?',
        options: [
            'Both are broadcast to ff:ff:ff:ff:ff:ff',
            'The request is broadcast to ff:ff:ff:ff:ff:ff; the reply is unicast back to the asker\'s MAC',
            'The request goes to the default gateway\'s MAC; the reply is broadcast',
            'Both are unicast to the switch',
        ],
        correct: 1,
        explanation: 'The asker does not know the target\'s MAC — that is the question — so the request must reach everyone on the LAN. The target learns the asker\'s MAC from the request itself, so its reply can go straight back as a unicast frame.',
    },
    {
        question: 'A switch receives a frame whose destination MAC is not in its MAC table. What does it do?',
        options: [
            'Drops it',
            'Sends an ARP request for that MAC',
            'Floods it out every port except the one it arrived on',
            'Sends it back to the sender',
        ],
        correct: 2,
        explanation: 'An unknown destination is flooded — every other port gets a copy, and only the owner accepts it. ARP maps IP to MAC; a switch never uses ARP to find ports. It learns the destination\'s port only when that host sends a frame of its own.',
    },
    {
        question: 'Two hosts talk, go quiet for ten minutes, then talk again without any ARP traffic. Why might the switch flood their first frame?',
        options: [
            'The ARP cache expired',
            'The switch\'s MAC table entries aged out (after 300 s by default) while the hosts\' ARP caches still held each other\'s MAC',
            'Switches flood the first frame of every conversation',
            'The hosts changed MAC addresses',
        ],
        correct: 1,
        explanation: 'The two caches age independently. A host with a live ARP entry sends a unicast frame without broadcasting, so nothing has re-taught the switch where the destination is. It floods until that host sends something. Mismatched ARP and MAC-table timers are a classic cause of unicast flooding.',
    },
];

function QuizPanel({ quizState, setQuizState }) {
    const q = quizQuestions[quizState.current];
    if (quizState.complete) {
        return (
            <div className="text-center py-2">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{quizQuestions.length}</div>
                <div className="text-pink-300/80 text-sm mb-4">{quizState.score === quizQuestions.length ? 'Perfect — layer 2 has no secrets.' : 'Run the aging scenario and retry.'}</div>
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
const SW = { x: 380, y: 190, w: 210, h: 70 };
const PORT_POS = { 1: [SW.x - 72, SW.y - SW.h / 2], 2: [SW.x + 72, SW.y - SW.h / 2], 3: [SW.x - 72, SW.y + SW.h / 2], 4: [SW.x + 72, SW.y + SW.h / 2] };
const KIND = {
    'arp-req': { fill: '#78350f', stroke: '#fbbf24', text: 'ARP?' },
    'arp-rep': { fill: '#14532d', stroke: '#4ade80', text: 'ARP' },
    data:      { fill: '#831843', stroke: '#f472b6', text: 'IP' },
};
const HW = 150, HH = 54;

function LanStage({ step }) {
    const active = new Set(step.frames.flatMap(f => [f.from, f.to]));
    return (
        <svg viewBox="0 0 760 380" width="100%" className="select-none">
            <style>{`.l2-box { transition: fill .4s ease, stroke .4s ease; } .l2-flow { stroke-dasharray: 7 6; animation: l2flow .6s linear infinite; } @keyframes l2flow { to { stroke-dashoffset: -26; } }`}</style>
            {HOSTS.map(h => {
                const [px, py] = PORT_POS[h.port];
                const hot = step.frames.some(f => (f.dir === 'in' && f.from === h.id) || (f.dir === 'out' && f.to === h.id));
                return (
                    <line key={`c-${h.id}`} x1={h.pos[0]} y1={h.pos[1]} x2={px} y2={py}
                        stroke={hot ? '#f9a8d4' : '#334155'} strokeWidth={hot ? 2.4 : 2} className={hot ? 'l2-flow' : ''} />
                );
            })}

            {/* switch */}
            <rect x={SW.x - SW.w / 2} y={SW.y - SW.h / 2} width={SW.w} height={SW.h} rx="10" fill="#111827" stroke="#64748b" strokeWidth="2" />
            <text x={SW.x} y={SW.y - 2} textAnchor="middle" fontSize="13" fontWeight="700" fill="#e2e8f0">switch</text>
            <text x={SW.x} y={SW.y + 15} textAnchor="middle" fontSize="9" fill="#64748b" fontFamily="monospace">
                {step.decision === 'flood' ? 'FLOOD' : step.decision === 'forward' ? 'FORWARD' : 'learns from every source MAC'}
            </text>
            {Object.entries(PORT_POS).map(([p, [px, py]]) => (
                <g key={p}>
                    <rect x={px - 11} y={py - 9} width={22} height={18} rx="3" fill="#0f172a" stroke="#94a3b8" strokeWidth="1.3" />
                    <text x={px} y={py + 3.5} textAnchor="middle" fontSize="10" fontWeight="700" fill="#e2e8f0" fontFamily="monospace">{p}</text>
                </g>
            ))}

            {HOSTS.map(h => {
                const on = active.has(h.id);
                return (
                    <g key={h.id}>
                        <rect x={h.pos[0] - HW / 2} y={h.pos[1] - HH / 2} width={HW} height={HH} rx="9" className="l2-box"
                            fill={on ? '#1e1b2e' : '#0f172a'} stroke={on ? '#f472b6' : '#334155'} strokeWidth={on ? 2 : 1.3} />
                        <text x={h.pos[0]} y={h.pos[1] - 8} textAnchor="middle" fontSize="12" fontWeight="700" fill="#f1f5f9">{h.id} · {h.ip}</text>
                        <text x={h.pos[0]} y={h.pos[1] + 8} textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="monospace">{h.mac}</text>
                        <text x={h.pos[0]} y={h.pos[1] + 21} textAnchor="middle" fontSize="8.5" fill="#475569" fontFamily="monospace">port {h.port}</text>
                    </g>
                );
            })}

            {step.frames.map((f, i) => {
                const h = host(f.dir === 'in' ? f.from : f.to);
                const [px, py] = PORT_POS[h.port];
                const [hx, hy] = h.pos;
                const t = 0.6;
                const x = f.dir === 'in' ? hx + (px - hx) * t : px + (hx - px) * t;
                const y = f.dir === 'in' ? hy + (py - hy) * t : py + (hy - py) * t;
                const k = KIND[f.kind];
                const dim = f.outcome === 'drop' || f.outcome === 'ignore';
                return (
                    <g key={`${f.dir}-${f.to ?? f.from}-${i}`} style={{ opacity: dim ? 0.55 : 1 }}>
                        <rect x={x - 22} y={y - 10} width={44} height={20} rx="5" fill={k.fill} stroke={k.stroke} strokeWidth="1.5" />
                        <text x={x} y={y + 4} textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#f8fafc" fontFamily="monospace">{k.text}</text>
                        {f.outcome && (
                            <text x={x} y={y + (f.dir === 'out' && hy < SW.y ? -15 : 24)} textAnchor="middle" fontSize="9" fontWeight="700" fontFamily="monospace"
                                fill={f.outcome === 'accept' || f.outcome === 'reply' ? '#4ade80' : f.outcome === 'refresh' ? '#fbbf24' : '#94a3b8'}>
                                {f.outcome === 'reply' ? 'it’s me' : f.outcome === 'accept' ? 'accept' : f.outcome === 'refresh' ? 'refresh' : f.outcome === 'ignore' ? 'ignore' : 'drop'}
                            </text>
                        )}
                    </g>
                );
            })}

            {step.frame && (
                <g>
                    <rect x={20} y={348} width={720} height={26} rx="7" fill="#020617" stroke="#1e293b" />
                    <text x={32} y={365} fontSize="10" fill="#64748b" fontFamily="monospace">src {short(step.frame.srcMac)} → dst {step.frame.dstMac === BCAST ? BCAST : short(step.frame.dstMac)}</text>
                    <text x={330} y={365} fontSize="10.5" fontWeight="700" fill={KIND[step.frame.kind].stroke} fontFamily="monospace">{step.frame.label}</text>
                </g>
            )}
        </svg>
    );
}

const codeExample = `class LearningSwitch:
    AGING = 300                                   # seconds, the IEEE 802.1D default
    BROADCAST = 'ff:ff:ff:ff:ff:ff'

    def __init__(self, ports):
        self.ports = ports
        self.table = {}                           # MAC -> (port, last_seen)

    def receive(self, src, dst, in_port, now):
        """Return the ports a frame from src to dst goes out of."""
        self.table[src] = (in_port, now)          # learn: src lives behind in_port

        entry = self.table.get(dst)
        if entry and now - entry[1] >= self.AGING:
            del self.table[dst]                   # aged out
            entry = None
        if dst == self.BROADCAST or entry is None:
            return [p for p in self.ports if p != in_port]   # flood
        port = entry[0]
        return [] if port == in_port else [port]             # forward (or filter)

sw = LearningSwitch([1, 2, 3, 4])
print(sw.receive('aa:01', 'ff:ff:ff:ff:ff:ff', 1, now=0))   # [2, 3, 4]  ARP request
print(sw.receive('aa:03', 'aa:01', 3, now=0))               # [1]        ARP reply
print(sw.receive('aa:01', 'aa:03', 1, now=400))             # [2, 3, 4]  aa:03 aged out`;

export default function ArpSwitchingPage() {
    const [preset, setPreset] = useState(PRESETS[0]);
    const [events, setEvents] = useState(PRESETS[0].events);
    const [warmArp, setWarmArp] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1200);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const stepHistory = useMemo(() => generateSteps(events, { warmArp }), [events, warmArp]);

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
    const applyPreset = (p) => { setPreset(p); setEvents(p.events); setWarmArp(Boolean(p.warmArp)); restart(); };
    const shuffle = () => {
        const gaps = [1, 2, 5, 30, 320, 400, 1300];
        let t = 0;
        const out = Array.from({ length: 3 + Math.floor(Math.random() * 2) }, (_, i) => {
            if (i) t += gaps[Math.floor(Math.random() * gaps.length)];
            const a = HOSTS[Math.floor(Math.random() * 4)].id;
            let b = a;
            while (b === a) b = HOSTS[Math.floor(Math.random() * 4)].id;
            return { from: a, to: b, at: t };
        });
        // Half the time the switch has just restarted under hosts that already know each other
        setPreset(null); setEvents(out); setWarmArp(Math.random() < 0.5); restart();
    };
    const jumpTo = (ei) => { const i = stepHistory.findIndex(s => s.ei === ei); if (i >= 0) { setCurrentStep(i); setIsPlaying(false); } };

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-pink-500 to-rose-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/computer-networks" className="flex items-center text-white hover:text-pink-100 transition-colors mb-6 w-fit">
                        <ArrowLeft className="h-5 w-5 mr-2" />Back to Computer Networks
                    </Link>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">ARP and Switching</h1>
                        <p className="text-lg text-pink-100 mb-6 max-w-3xl mx-auto">
                            Hosts ask &quot;who has this IP?&quot; to find a MAC address; the switch quietly learns which MAC lives behind
                            which port. Flood when unsure, forward once learned.
                        </p>
                        <div className="flex flex-wrap justify-center gap-3 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">ARP: IP → MAC</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Switch: MAC → port</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">MAC aging: {MAC_AGING} s</div>
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
                                    <Shuffle size={18} />Random traffic
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

                            <div className="flex flex-wrap gap-1.5 mb-3">
                                {events.map((ev, i) => (
                                    <button key={i} onClick={() => jumpTo(i)}
                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-colors ${step.ei === i
                                            ? 'bg-pink-500/20 border-pink-500/50 text-pink-200'
                                            : step.ei > i ? 'bg-slate-800/60 border-slate-700 text-slate-400' : 'border-slate-800 text-slate-600 hover:text-slate-400'}`}>
                                        t={ev.at}s · {ev.from} → {ev.to}
                                    </button>
                                ))}
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-1.5 mb-4">
                                <div className="bg-pink-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${((currentStep + 1) / stepHistory.length) * 100}%` }} />
                            </div>

                            <div className="bg-slate-950/60 rounded-lg border border-slate-800 p-2">
                                <LanStage step={step} />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-3 mt-4">
                                <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-2"><Table className="h-3.5 w-3.5 text-pink-400" />Switch MAC table · t = {step.t} s</div>
                                    {step.table.length === 0 ? <p className="text-[11px] text-slate-600 font-mono">empty</p> : (
                                        <div className="space-y-0.5 font-mono text-[11px]">
                                            {step.table.map(e => (
                                                <div key={e.mac} className={`grid grid-cols-[1.4fr_0.6fr_0.8fr] gap-2 px-1.5 py-0.5 rounded ${step.learned === e.mac ? 'bg-green-500/15 text-green-200' : 'text-slate-300'}`}>
                                                    <span>{e.mac}</span><span>port {e.port}</span><span className="text-right text-slate-500">{e.age}s ago</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-2"><Cable className="h-3.5 w-3.5 text-pink-400" />Host ARP caches</div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {HOSTS.map(h => (
                                            <div key={h.id} className={`rounded border px-2 py-1 ${step.src === h.id ? 'border-pink-500/50' : 'border-slate-800'}`}>
                                                <div className="text-[10px] text-slate-400 font-semibold">{h.id}</div>
                                                {step.arp[h.id].length === 0 ? <div className="text-[10px] text-slate-600 font-mono">empty</div>
                                                    : step.arp[h.id].map(e => (
                                                        <div key={e.ip} className="text-[10px] font-mono text-slate-300 flex justify-between gap-1">
                                                            <span>{e.ip}→{short(e.mac)}</span><span className="text-slate-500">{e.age}s</span>
                                                        </div>
                                                    ))}
                                            </div>
                                        ))}
                                    </div>
                                </div>
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
                            <h3 className="font-bold text-white mb-3">The Switch&apos;s Three Rules</h3>
                            <div className="space-y-2 text-xs">
                                {[
                                    { on: step.phase === 'frame-in', k: 'Learn', v: 'source MAC → incoming port' },
                                    { on: step.decision === 'flood', k: 'Flood', v: 'broadcast or unknown destination' },
                                    { on: step.decision === 'forward', k: 'Forward', v: 'known destination → its one port' },
                                ].map(row => (
                                    <div key={row.k} className={`flex justify-between gap-3 px-2 py-1.5 rounded-lg transition-colors ${row.on ? 'bg-pink-500/15 text-pink-200' : 'text-slate-500'}`}>
                                        <span className="font-semibold">{row.k}</span><span className="text-right">{row.v}</span>
                                    </div>
                                ))}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
                                A fourth, filter, applies when the destination is on the port the frame came in on: the switch drops it.
                                A hub has none of these rules — it repeats every frame out every port.
                            </p>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">Knowledge Check</h3>
                            <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <button onClick={() => setShowCode(c => !c)} className="flex items-center gap-2 text-pink-400 hover:text-pink-300 font-medium">
                                <Code2 className="h-5 w-5" />{showCode ? 'Hide' : 'Show'} Python: a learning switch
                            </button>
                            {showCode && <div className="mt-4"><CodeBlock code={codeExample} language="python" /></div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
