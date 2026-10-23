"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, RotateCcw, SkipForward, SkipBack, Shuffle, Info, Code2, Waypoints, Unplug,
} from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── Model ───────────────────────────────────────────────────────────────────
   Every router describes its own links in a link-state advertisement (LSA)
   with a sequence number. In each flooding round a router forwards every LSA
   it accepted in the previous round to all neighbours except the one it came
   from; a receiver keeps an LSA only if it is newer than the copy it holds.
   Once every database is identical, each router runs Dijkstra on it. */
const TOPOLOGIES = [
    { id: 'six', label: 'Six routers', source: 'A', fail: ['B', 'C'],
        nodes: { A: [100, 180], B: [265, 68], C: [475, 68], D: [645, 180], E: [475, 300], F: [265, 300] },
        edges: [['A', 'B', 2], ['A', 'F', 1], ['B', 'C', 3], ['B', 'F', 2], ['C', 'D', 2], ['C', 'E', 1], ['D', 'E', 4], ['E', 'F', 5]] },
    { id: 'ring', label: 'Ring with a chord', source: 'A', fail: ['A', 'B'],
        nodes: { A: [380, 52], B: [612, 140], C: [530, 305], D: [230, 305], E: [148, 140] },
        edges: [['A', 'B', 1], ['B', 'C', 2], ['C', 'D', 1], ['D', 'E', 2], ['E', 'A', 1], ['A', 'C', 4]] },
];
const PENTAGON = { A: [380, 52], B: [612, 140], C: [530, 305], D: [230, 305], E: [148, 140] };
const ORIGIN_COLOR = { A: '#f472b6', B: '#38bdf8', C: '#fbbf24', D: '#4ade80', E: '#a78bfa', F: '#fb923c' };
const INF = Infinity;
const show = (d) => (d === INF ? '∞' : String(d));

function dijkstra(names, adj, src) {
    const dist = Object.fromEntries(names.map(n => [n, n === src ? 0 : INF]));
    const prev = Object.fromEntries(names.map(n => [n, null]));
    const first = Object.fromEntries(names.map(n => [n, null]));
    const visited = [];
    const order = [];
    for (;;) {
        const cands = names.filter(n => !visited.includes(n) && dist[n] < INF);
        if (!cands.length) break;
        const u = cands.reduce((a, b) => (dist[b] < dist[a] || (dist[b] === dist[a] && b < a) ? b : a));
        visited.push(u);
        const relax = [];
        for (const [v, c] of adj[u]) {
            if (visited.includes(v)) continue;
            if (dist[u] + c < dist[v]) {
                relax.push({ v, from: dist[v], to: dist[u] + c });
                dist[v] = dist[u] + c;
                prev[v] = u;
                first[v] = u === src ? v : first[u];
            }
        }
        order.push({ u, relax, dist: { ...dist }, prev: { ...prev }, first: { ...first }, visited: [...visited] });
    }
    return { dist, prev, first, order };
}

/** The map a router can build from its database: a link counts only when
    both ends list it (OSPF's two-way check). */
function mapFrom(db, names) {
    const adj = Object.fromEntries(names.map(n => [n, []]));
    for (const u of names) {
        const lu = db[u];
        if (!lu) continue;
        for (const [v, c] of lu.links) {
            const lv = db[v];
            if (lv && lv.links.some(([w, cc]) => w === u && cc === c)) adj[u].push([v, c]);
        }
        adj[u].sort((p, q) => (p[0] < q[0] ? -1 : 1));
    }
    return adj;
}

function generateSteps({ topo, source }) {
    const names = Object.keys(topo.nodes).sort();
    let edges = topo.edges.map(([a, b, c]) => ({ a, b, c }));
    const nbrs = (x) => edges.filter(e => e.a === x || e.b === x).map(e => (e.a === x ? e.b : e.a)).sort();
    const linksOf = (x) => edges.filter(e => e.a === x || e.b === x).map(e => [e.a === x ? e.b : e.a, e.c]).sort();
    const db = Object.fromEntries(names.map(x => [x, { [x]: { seq: 1, links: linksOf(x) } }]));
    const steps = [];
    let failed = null;
    const seqView = () => Object.fromEntries(names.map(x => [x, Object.fromEntries(Object.entries(db[x]).map(([o, l]) => [o, l.seq]))]));
    const snap = (extra) => steps.push({ names, source, failed, db: seqView(), tx: [], fresh: [], ...extra });

    snap({ phase: 'origin', stage: 'flood',
        explanation: `Each router first discovers its own neighbours (with hello packets) and describes them in a link-state advertisement: its name, a sequence number, and every link with its cost. Right now each router's database holds exactly one LSA — its own. ${source}'s says: ${linksOf(source).map(([v, c]) => `${v} at ${c}`).join(', ')}.` });

    const flood = (pending, stage, label) => {
        let round = 0;
        while (pending.length) {
            round++;
            const tx = [];
            for (const p of pending) for (const v of nbrs(p.at)) if (v !== p.from) tx.push({ from: p.at, to: v, origin: p.origin, seq: db[p.at][p.origin].seq });
            tx.sort((a, b) => (a.from + a.to + a.origin < b.from + b.to + b.origin ? -1 : 1));
            const next = [], fresh = [];
            for (const t of tx) {
                const cur = db[t.to][t.origin];
                if (!cur || cur.seq < t.seq) {
                    db[t.to][t.origin] = { seq: t.seq, links: db[t.from][t.origin].links.map(l => [...l]) };
                    t.accepted = true;
                    next.push({ at: t.to, origin: t.origin, from: t.from });
                    fresh.push([t.to, t.origin]);
                } else t.accepted = false;
            }
            const acc = tx.filter(t => t.accepted).length;
            const complete = names.filter(x => names.every(o => db[x][o] && (stage === 'flood' || db[x][o].seq === db[o][o].seq))).length;
            snap({ phase: stage === 'flood' ? 'flood' : 'reflood', stage, round, tx, fresh,
                explanation: `${label} round ${round}: every router forwards each LSA it accepted last round to all neighbours except the one it came from. ${tx.length} copies cross links; ${acc} ${acc === 1 ? 'is' : 'are'} new and kept, ${tx.length - acc} ${tx.length - acc === 1 ? 'is a duplicate' : 'are duplicates'} — the receiver already holds that LSA at that sequence number — and ${tx.length - acc === 1 ? 'is' : 'are'} dropped. That rule is what makes the flood stop. ${complete} of ${names.length} routers now hold the complete, current map.` });
            pending = next;
        }
        return round;
    };

    const floodRounds = flood(names.map(x => ({ at: x, origin: x, from: null })), 'flood', 'Flooding');
    snap({ phase: 'synced', stage: 'flood', round: floodRounds,
        explanation: `After ${floodRounds} rounds nothing new arrives anywhere: every router's database is identical. Each now holds the entire topology — every router, link and cost — which is what separates link-state routing from distance vector, where a router only ever knows its neighbours' opinions.` });

    // ── Dijkstra at the source ──
    const run = (dbOf) => dijkstra(names, mapFrom(dbOf, names), source);
    const spf = run(db[source]);
    const initDist = Object.fromEntries(names.map(n => [n, n === source ? 0 : INF]));
    snap({ phase: 'spf-init', stage: 'spf', dist: initDist, visited: [], prev: {}, first: {}, current: null,
        explanation: `Router ${source} runs Dijkstra on its copy of the map. ${source} is at distance 0 and everything else starts at ∞. At each step the closest router not yet finalised is fixed for good, and its links are used to improve the others' tentative distances.` });
    spf.order.forEach((o, k) => {
        const relaxed = o.relax.map(r => `${r.v}: ${show(r.from)} → ${r.to}`).join(', ');
        snap({ phase: 'spf', stage: 'spf', iter: k + 1, current: o.u, dist: o.dist, prev: o.prev, first: o.first, visited: o.visited, relax: o.relax,
            explanation: k === 0
                ? `Finalise ${o.u} at distance 0. Relax its links: ${relaxed || 'nothing to improve'}.`
                : `Finalise ${o.u} at distance ${o.dist[o.u]} — the smallest tentative distance left, so no shorter path to it can exist (every other route would already be at least this long). Relax its links: ${relaxed || 'none of them improves anything'}.` });
    });
    const table = (res) => names.filter(n => n !== source).map(n => ({ dest: n, next: res.first[n], cost: res.dist[n] }));
    const t1 = table(spf);
    snap({ phase: 'table', stage: 'spf', dist: spf.dist, prev: spf.prev, first: spf.first, visited: names.filter(n => spf.dist[n] < INF), table: t1,
        explanation: `The shortest-path tree becomes ${source}'s forwarding table. Only the first hop is kept: ${source} does not need the rest of the path, because every other router ran the same algorithm on the same map and will make a consistent choice. No loops, as long as the databases agree.` });

    // ── a link fails ──
    const [fa, fb] = topo.fail;
    edges = edges.filter(e => [e.a, e.b].sort().join('-') !== [fa, fb].sort().join('-'));
    failed = [fa, fb].sort().join('-');
    for (const x of [fa, fb]) db[x][x] = { seq: db[x][x].seq + 1, links: linksOf(x) };
    snap({ phase: 'fail', stage: 'fail', fresh: [[fa, fa], [fb, fb]], table: t1,
        explanation: `The ${fa}–${fb} link fails. Both ends notice and each issues a new LSA with sequence number 2 that no longer lists the other. The higher sequence number is how every router will know this news replaces what it holds.` });
    const reRounds = flood([{ at: fa, origin: fa, from: null }, { at: fb, origin: fb, from: null }], 'reflood', 'Re-flooding');
    const spf2 = run(db[source]);
    const t2 = table(spf2);
    const changed = t2.filter((row, i) => row.next !== t1[i].next || row.cost !== t1[i].cost).map(r => r.dest);
    snap({ phase: 'recompute', stage: 'spf', dist: spf2.dist, prev: spf2.prev, first: spf2.first, visited: names.filter(n => spf2.dist[n] < INF), table: t2, oldTable: t1, changedRows: changed,
        explanation: `${reRounds} rounds later every database again agrees, and ${source} simply reruns Dijkstra. ${changed.length ? `Changed: ${changed.map(d => { const r = t2.find(x => x.dest === d); return r.cost === INF ? `${d} unreachable` : `${d} now via ${r.next} at ${r.cost}`; }).join('; ')}.` : 'Its own table does not change.'} No router counted to infinity: each computed from facts it holds, not from its neighbours' opinions. The price is flooding every change to every router and rerunning Dijkstra each time.` });
    return steps;
}

/* During Dijkstra the tentative distances and the finalised set are on screen,
   so the next router finalised is decided: the smallest tentative distance,
   ties to the alphabetically first. The question lists the distances by
   letter, not sorted by size, so the answer is not simply the first one named. */
const predictFor = (step, next) => {
    if (!step || !next || next.phase !== 'spf' || !['spf-init', 'spf'].includes(step.phase)) return null;
    const open = step.names.filter(n => !step.visited.includes(n) && step.dist[n] < INF);
    if (open.length < 2) return null;
    const byDist = [...open].sort((a, b) => step.dist[a] - step.dist[b] || (a < b ? -1 : 1));
    // Alphabetical, then rotated by how many routers are already final, so
    // the early letters near the source are not always in the first slot.
    const abc = byDist.slice(0, 4).sort();
    const r = step.visited.length % abc.length;
    const pick = [...abc.slice(r), ...abc.slice(0, r)];
    return {
        question: `Tentative distances from ${step.source}: ${[...open].sort().map(n => `${n} ${step.dist[n]}`).join(', ')}. Which router does Dijkstra finalise next? (Ties go to the earlier letter.)`,
        options: pick.map(n => `Router ${n}`),
        correct: pick.indexOf(next.current),
        because: `${next.current} has the smallest tentative distance (${step.dist[next.current]}) among the routers not yet finalised. Any other path to it would have to leave the finalised set through a router that is already at least that far away.`,
    };
};

const quizQuestions = [
    {
        question: 'What does a link-state router know that a distance-vector router never does?',
        options: [
            'Its neighbours\' distances to every destination',
            'The complete topology: every router, every link and its cost',
            'Only the next hop for each destination',
            'The physical location of each router',
        ],
        correct: 1,
        explanation: 'Flooding gives every router every LSA, so each one holds the whole map and computes its own shortest paths. A distance-vector router only ever learns its neighbours\' claimed distances, which is why stale claims can make it count to infinity.',
    },
    {
        question: 'Why does each LSA carry a sequence number?',
        options: [
            'To encrypt the advertisement',
            'So a router can tell a newer LSA from one it already holds — keeping the newest, dropping duplicates, and letting the flood stop',
            'To count how many hops it has travelled',
            'To order the links inside the LSA',
        ],
        correct: 1,
        explanation: 'A router accepts and re-floods an LSA only if its sequence number is higher than the copy it already has from that origin. Duplicates are dropped, which ends the flood, and a link failure is announced with a higher number so it replaces the old description everywhere.',
    },
    {
        question: 'Links: A–B cost 1, B–C cost 1, A–C cost 5. In A\'s forwarding table, what is the entry for C?',
        options: ['Next hop C, cost 5', 'Next hop B, cost 2', 'Next hop B, cost 1', 'Next hop C, cost 2'],
        correct: 1,
        explanation: 'Dijkstra from A finalises B at 1, then reaches C through B at 1 + 1 = 2, beating the direct link at 5. The forwarding table keeps only the first hop of that path — B — and the total cost 2.',
    },
];

function QuizPanel({ quizState, setQuizState }) {
    const q = quizQuestions[quizState.current];
    if (quizState.complete) {
        return (
            <div className="text-center py-2">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{quizQuestions.length}</div>
                <div className="text-pink-300/80 text-sm mb-4">{quizState.score === quizQuestions.length ? 'Perfect — OSPF holds no secrets.' : 'Step through the Dijkstra run again, then retry.'}</div>
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
const R = 23;
function LsStage({ step, topo }) {
    const P = topo.nodes;
    const spfPhase = ['spf-init', 'spf', 'table', 'recompute'].includes(step.phase);
    const tree = new Set(spfPhase && step.prev ? Object.entries(step.prev).filter(([v, u]) => u && (step.visited || []).includes(v)).map(([v, u]) => [u, v].sort().join('-')) : []);
    /* one envelope per directed link, listing the LSAs on it this round */
    const groups = {};
    for (const t of step.tx) (groups[`${t.from}>${t.to}`] ??= []).push(t);
    return (
        <svg viewBox="0 0 760 360" width="100%" className="select-none">
            <style>{`.ls-n { transition: fill .4s ease, stroke .4s ease; } .ls-e { transition: stroke .4s ease, stroke-width .3s ease; }`}</style>
            {topo.edges.map(([a, b, c]) => {
                const key = [a, b].sort().join('-');
                const down = step.failed === key;
                const inTree = tree.has(key);
                const [ax, ay] = P[a], [bx, by] = P[b];
                return (
                    <g key={key}>
                        <line x1={ax} y1={ay} x2={bx} y2={by} className="ls-e"
                            stroke={down ? '#7f1d1d' : inTree ? '#4ade80' : '#475569'} strokeWidth={inTree ? 4 : 2.2} strokeDasharray={down ? '6 5' : undefined} />
                        <circle cx={(ax + bx) / 2} cy={(ay + by) / 2} r="10" fill="#0f172a" stroke={down ? '#ef4444' : '#334155'} />
                        <text x={(ax + bx) / 2} y={(ay + by) / 2 + 3.5} textAnchor="middle" fontSize="10" fontWeight="700" fill={down ? '#fca5a5' : '#cbd5e1'} fontFamily="monospace">{down ? '×' : c}</text>
                    </g>
                );
            })}

            {Object.entries(groups).map(([k, list]) => {
                const [from, to] = k.split('>');
                const [ax, ay] = P[from], [bx, by] = P[to];
                const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
                const t = 0.62;
                const px = ax + dx * t + (dy / len) * 13, py = ay + dy * t - (dx / len) * 13;
                const w = 10 + list.length * 11;
                return (
                    <g key={k}>
                        <rect x={px - w / 2} y={py - 9} width={w} height={17} rx="4" fill="#0f172a" stroke="#64748b" strokeWidth="1" />
                        {list.map((t2, i) => (
                            <text key={t2.origin} x={px - w / 2 + 8 + i * 11} y={py + 3.5} fontSize="10" fontWeight="700" fontFamily="monospace"
                                fill={t2.accepted ? ORIGIN_COLOR[t2.origin] : '#475569'} textDecoration={t2.accepted ? undefined : 'line-through'}>{t2.origin}</text>
                        ))}
                    </g>
                );
            })}

            {Object.entries(P).map(([x, [cx, cy]]) => {
                const isSrc = x === step.source && spfPhase;
                const fin = spfPhase && (step.visited || []).includes(x);
                const cur = step.current === x;
                return (
                    <g key={x}>
                        <circle cx={cx} cy={cy} r={R} className="ls-n"
                            fill={cur ? '#831843' : fin ? '#14532d' : '#0f172a'}
                            stroke={cur ? '#f472b6' : fin ? '#4ade80' : ORIGIN_COLOR[x]} strokeWidth={cur || isSrc ? 3 : 2} />
                        <text x={cx} y={cy + 5} textAnchor="middle" fontSize="15" fontWeight="700" fill="#f8fafc">{x}</text>
                        {spfPhase && step.dist && (
                            <text x={cx} y={cy + R + 15} textAnchor="middle" fontSize="10.5" fontWeight="700" fontFamily="monospace"
                                fill={fin ? '#86efac' : step.dist[x] === INF ? '#64748b' : '#f9a8d4'}>
                                {x === step.source ? 'source' : `d=${show(step.dist[x])}`}
                            </text>
                        )}
                        {!spfPhase && (
                            <text x={cx} y={cy + R + 15} textAnchor="middle" fontSize="9.5" fontFamily="monospace" fill="#94a3b8">
                                {step.names.filter(o => step.db[x][o] && step.db[x][o] === step.db[o][o]).length}/{step.names.length} current
                            </text>
                        )}
                    </g>
                );
            })}
        </svg>
    );
}

function LsdbMatrix({ step }) {
    const fresh = new Set(step.fresh.map(([x, o]) => `${x}${o}`));
    return (
        <div className="overflow-x-auto">
            <table className="text-[11px] font-mono">
                <thead>
                    <tr>
                        <th className="text-left text-slate-500 font-normal pr-3 pb-1">database of</th>
                        {step.names.map(o => <th key={o} className="w-8 pb-1 font-bold" style={{ color: ORIGIN_COLOR[o] }}>{o}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {step.names.map(x => (
                        <tr key={x}>
                            <td className="text-slate-300 pr-3">router {x}</td>
                            {step.names.map(o => {
                                const seq = step.db[x][o];
                                const isNew = fresh.has(`${x}${o}`);
                                return (
                                    <td key={o} className="p-0.5">
                                        <div className={`w-7 h-6 rounded flex items-center justify-center transition-colors ${isNew ? 'ring-2 ring-white/70' : ''}`}
                                            style={{ background: seq ? `${ORIGIN_COLOR[o]}${seq > 1 ? '' : '55'}` : '#1e293b', color: !seq ? '#475569' : seq > 1 ? '#0f172a' : '#f1f5f9' }}>
                                            {seq ? `#${seq}` : '·'}
                                        </div>
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
            <p className="text-[10px] text-slate-600 mt-1">Each cell is the sequence number of origin&apos;s LSA held by that router; ringed cells arrived this step.</p>
        </div>
    );
}

function SpfPanel({ step }) {
    const rows = step.names.filter(n => n !== step.source);
    const relaxed = new Set((step.relax || []).map(r => r.v));
    const changed = new Set(step.changedRows || []);
    const showTable = ['table', 'recompute', 'fail'].includes(step.phase) && step.table;
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {step.dist && (
                <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                    <div className="text-xs font-semibold text-slate-300 mb-1.5">Dijkstra at {step.source}</div>
                    <div className="grid grid-cols-4 gap-1 text-[10px] text-slate-600 font-mono px-1"><span>router</span><span>dist</span><span>via</span><span>state</span></div>
                    {rows.map(n => {
                        const fin = (step.visited || []).includes(n);
                        return (
                            <div key={n} className={`grid grid-cols-4 gap-1 text-[11px] font-mono px-1 rounded ${step.current === n ? 'bg-pink-500/20 text-pink-100' : relaxed.has(n) ? 'bg-yellow-500/15 text-yellow-100' : 'text-slate-300'}`}>
                                <span>{n}</span><span>{show(step.dist[n])}</span><span>{step.prev?.[n] ?? '—'}</span>
                                <span className={fin ? 'text-green-400' : 'text-slate-500'}>{fin ? 'final' : step.dist[n] === INF ? '—' : 'tentative'}</span>
                            </div>
                        );
                    })}
                </div>
            )}
            {showTable && (
                <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                    <div className="text-xs font-semibold text-slate-300 mb-1.5">{step.source}&apos;s forwarding table</div>
                    <div className="grid grid-cols-3 gap-1 text-[10px] text-slate-600 font-mono px-1"><span>destination</span><span>next hop</span><span>cost</span></div>
                    {step.table.map(r => (
                        <div key={r.dest} className={`grid grid-cols-3 gap-1 text-[11px] font-mono px-1 rounded ${changed.has(r.dest) ? 'bg-yellow-500/20 text-yellow-100' : 'text-slate-300'}`}>
                            <span>{r.dest}</span><span>{r.next ?? '—'}</span><span>{show(r.cost)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function randomTopology() {
    const names = Object.keys(PENTAGON);
    const order = [...names].sort(() => Math.random() - 0.5);
    const edges = [];
    const has = (a, b) => edges.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
    for (let i = 1; i < order.length; i++) edges.push([order[i], order[Math.floor(Math.random() * i)], 1 + Math.floor(Math.random() * 5)]);
    for (let k = 0; k < 20 && edges.length < 7; k++) {
        const a = names[Math.floor(Math.random() * 5)], b = names[Math.floor(Math.random() * 5)];
        if (a !== b && !has(a, b)) edges.push([a, b, 1 + Math.floor(Math.random() * 5)]);
    }
    return { id: 'random', label: 'Random', nodes: PENTAGON, edges, fail: edges[Math.floor(Math.random() * edges.length)].slice(0, 2), source: 'A' };
}

const codeExample = `import heapq

def forwarding_table(lsdb, source):
    """lsdb[router] = {neighbour: cost} — the map every router floods.
    Returns {destination: (next_hop, cost)} for one router."""
    dist, first_hop = {source: 0}, {}
    done = set()
    heap = [(0, source, None)]
    while heap:
        d, u, hop = heapq.heappop(heap)
        if u in done:
            continue                       # a stale, longer entry
        done.add(u)
        if u != source:
            first_hop[u] = hop
        for v, cost in lsdb[u].items():
            nd = d + cost
            if v not in done and nd < dist.get(v, float('inf')):
                dist[v] = nd
                # leaving the source, the first hop is the neighbour itself
                heapq.heappush(heap, (nd, v, v if u == source else hop))
    return {v: (first_hop[v], dist[v]) for v in first_hop}

lsdb = {'A': {'B': 2, 'F': 1}, 'B': {'A': 2, 'C': 3, 'F': 2}, 'C': {'B': 3, 'D': 2, 'E': 1},
        'D': {'C': 2, 'E': 4}, 'E': {'C': 1, 'D': 4, 'F': 5}, 'F': {'A': 1, 'B': 2, 'E': 5}}
print(forwarding_table(lsdb, 'A'))`;

export default function LinkStatePage() {
    const [topo, setTopo] = useState(TOPOLOGIES[0]);
    const [source, setSource] = useState('A');
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1200);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const stepHistory = useMemo(() => generateSteps({ topo, source }), [topo, source]);

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
    const loadTopo = (t) => { setTopo(t); setSource(t.source); restart(); };
    const jump = (phase) => { const i = stepHistory.findIndex(s => s.phase === phase); if (i >= 0) { setCurrentStep(i); setIsPlaying(false); } };
    const PHASES = [['origin', 'Flooding'], ['spf-init', 'Dijkstra'], ['fail', 'Link failure']];
    const stageOf = (s) => (['origin', 'flood', 'synced'].includes(s.phase) ? 'origin' : ['fail', 'reflood', 'recompute'].includes(s.phase) ? 'fail' : 'spf-init');

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-pink-500 to-rose-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/computer-networks" className="flex items-center text-white hover:text-pink-100 transition-colors mb-6 w-fit">
                        <ArrowLeft className="h-5 w-5 mr-2" />Back to Computer Networks
                    </Link>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Link State Routing</h1>
                        <p className="text-lg text-pink-100 mb-6 max-w-3xl mx-auto">
                            Tell everyone everything about your own links, then let each router work out the best paths for itself.
                            Flooding builds one shared map; Dijkstra turns it into a forwarding table.
                        </p>
                        <div className="flex flex-wrap justify-center gap-3 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Flooding: O(E) per change</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Dijkstra: O(E log V)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">OSPF, IS-IS</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                <span className="text-xs text-slate-500 mr-1">Network</span>
                                {TOPOLOGIES.map(t => (
                                    <button key={t.id} onClick={() => loadTopo(t)}
                                        className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${topo.id === t.id ? 'bg-pink-500/20 border-pink-500/60 text-pink-200' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-pink-500/60'}`}>{t.label}</button>
                                ))}
                                <button onClick={() => loadTopo(randomTopology())}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border transition-colors ${topo.id === 'random' ? 'bg-pink-500/20 border-pink-500/60 text-pink-200' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-pink-500/60'}`}>
                                    <Shuffle className="h-3 w-3" />Random
                                </button>
                                <span className="text-xs text-slate-500 ml-3 mr-1">Run Dijkstra at</span>
                                {Object.keys(topo.nodes).sort().map(n => (
                                    <button key={n} onClick={() => { setSource(n); restart(); }}
                                        className={`w-7 h-7 rounded text-xs font-bold border ${source === n ? 'bg-pink-500/25 border-pink-500 text-pink-100' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>{n}</button>
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
                                <button onClick={() => jump('fail')}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors font-medium">
                                    <Unplug size={18} />Jump to failure
                                </button>
                                <PredictToggle predict={predict} accent="pink" />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2 text-slate-300">Animation Speed: {speed}ms</label>
                                <input type="range" min="200" max="2000" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-full max-w-md accent-pink-500" />
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 mb-3">
                                {PHASES.map(([ph, label]) => (
                                    <button key={ph} onClick={() => jump(ph)}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${stageOf(step) === ph ? 'bg-pink-500/20 border-pink-500/50 text-pink-200' : 'border-slate-800 text-slate-500 hover:text-slate-300'}`}>{label}</button>
                                ))}
                                <span className="ml-auto text-xs text-slate-500">Step {currentStep + 1} of {stepHistory.length}</span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-1.5 mb-4">
                                <div className="bg-pink-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${((currentStep + 1) / stepHistory.length) * 100}%` }} />
                            </div>

                            <div className="bg-slate-950/60 rounded-lg border border-slate-800 p-2">
                                <LsStage step={step} topo={topo} />
                            </div>
                            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
                                <span className="flex items-center gap-1.5"><span className="px-1 rounded border border-slate-500 text-[9px] font-mono text-pink-300">A C</span>LSAs on that link this round</span>
                                <span className="flex items-center gap-1.5"><span className="text-[10px] font-mono text-slate-500 line-through">B</span>duplicate, dropped</span>
                                <span className="flex items-center gap-1.5"><span className="w-5 border-t-4 border-green-400" />shortest-path tree</span>
                            </div>

                            <div className="mt-4 grid grid-cols-1 gap-4">
                                {['origin', 'flood', 'synced', 'fail', 'reflood'].includes(step.phase) && <LsdbMatrix step={step} />}
                                {(step.dist || step.table) && <SpfPanel step={step} />}
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
                            <div className="flex items-center gap-2 mb-4">
                                <Waypoints className="h-5 w-5 text-pink-400" />
                                <h3 className="font-bold text-white">Link State vs Distance Vector</h3>
                            </div>
                            <div className="space-y-2 text-xs">
                                {[
                                    ['Each router knows', 'the whole map', 'neighbours’ distances'],
                                    ['Sends', 'its own links, to everyone', 'its whole table, to neighbours'],
                                    ['Computes', 'Dijkstra, locally', 'Bellman-Ford, together'],
                                    ['After a failure', 'flood + recompute', 'may count to ∞'],
                                    ['Examples', 'OSPF, IS-IS', 'RIP'],
                                ].map(([k, ls, dv]) => (
                                    <div key={k} className="grid grid-cols-[1.1fr_1fr_1fr] gap-2">
                                        <span className="text-slate-500">{k}</span>
                                        <span className="text-pink-200">{ls}</span>
                                        <span className="text-slate-400">{dv}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">Knowledge Check</h3>
                            <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <button onClick={() => setShowCode(c => !c)} className="flex items-center gap-2 text-pink-400 hover:text-pink-300 font-medium">
                                <Code2 className="h-5 w-5" />{showCode ? 'Hide' : 'Show'} Python: map to forwarding table
                            </button>
                            {showCode && <div className="mt-4"><CodeBlock code={codeExample} language="python" /></div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
