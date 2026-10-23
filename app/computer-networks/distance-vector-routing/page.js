"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, RotateCcw, SkipForward, SkipBack, Shuffle, Info, Code2, Share2, Unplug,
} from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── Model ───────────────────────────────────────────────────────────────────
   Synchronous Bellman-Ford, as textbooks draw it: in each round every router
   sends every neighbour its whole distance vector, then every router
   recomputes  D(x, y) = min over neighbours v of  c(x, v) + D_v(y).
   16 means unreachable, as in RIP. With poison reverse, a router tells the
   neighbour it routes through that the destination is unreachable. */
const INF = 16;

const TOPOLOGIES = [
    { id: 'chain', label: 'Chain', dest: 'D', fail: ['C', 'D'],
        nodes: { A: [110, 170], B: [290, 170], C: [470, 170], D: [650, 170] },
        edges: [['A', 'B', 1], ['B', 'C', 1], ['C', 'D', 1]] },
    { id: 'triangle', label: 'Triangle with a tail', dest: 'D', fail: ['C', 'D'],
        nodes: { A: [160, 75], B: [160, 275], C: [390, 175], D: [640, 175] },
        edges: [['A', 'B', 1], ['A', 'C', 1], ['B', 'C', 1], ['C', 'D', 1]] },
    { id: 'backup', label: 'Slow backup path', dest: 'D', fail: ['C', 'D'],
        nodes: { A: [110, 200], B: [280, 75], C: [480, 75], D: [650, 200], E: [380, 300] },
        edges: [['A', 'B', 1], ['B', 'C', 1], ['C', 'D', 1], ['A', 'E', 3], ['E', 'D', 4]] },
];
const PENTAGON = { A: [380, 52], B: [612, 140], C: [530, 305], D: [230, 305], E: [148, 140] };

const show = (d) => (d >= INF ? '∞' : String(d));

function generateSteps({ topo, poison, dest }) {
    const names = Object.keys(topo.nodes).sort();
    let edges = topo.edges.map(([a, b, c]) => ({ a, b, c }));
    const cost = (x, v) => edges.find(e => (e.a === x && e.b === v) || (e.a === v && e.b === x))?.c ?? null;
    const nbrs = (x) => edges.filter(e => e.a === x || e.b === x).map(e => (e.a === x ? e.b : e.a)).sort();
    const failKey = [...topo.fail].sort().join('-');
    const costs = Object.fromEntries(topo.edges.map(([a, b, c]) => [[a, b].sort().join('-'), c]));

    let T = {};
    for (const x of names) {
        T[x] = {};
        for (const y of names) T[x][y] = { d: x === y ? 0 : INF, nh: null };
        for (const v of nbrs(x)) T[x][v] = { d: Math.min(INF, cost(x, v)), nh: v };
    }
    const heard = Object.fromEntries(names.map(x => [x, {}]));   // heard[x][v] = v's last vector to x
    const lastInputs = {};                                        // x -> { neighbour: what it advertised about dest }
    const steps = [];
    let failed = null;
    const clone = (t) => JSON.parse(JSON.stringify(t));
    const snap = (extra) => steps.push({ tables: clone(T), failed, dest, poison, names, costs, adv: null, changed: [], ...extra });

    const advertise = () => {
        const adv = {};
        for (const x of names) {
            adv[x] = {};
            for (const v of nbrs(x)) {
                adv[x][v] = {};
                for (const y of names) adv[x][v][y] = poison && T[x][y].nh === v ? INF : T[x][y].d;
            }
        }
        return adv;
    };
    const recompute = (x, prev) => {
        const row = {};
        for (const y of names) {
            if (y === x) { row[y] = { d: 0, nh: null }; continue; }
            let best = INF, nh = null;
            for (const v of nbrs(x)) {
                const vec = heard[x][v];
                if (!vec) continue;
                const val = Math.min(INF, cost(x, v) + vec[y]);
                if (val < best) { best = val; nh = v; }
            }
            // keep the current next hop on a tie, so routes do not flap
            const cur = prev[y].nh;
            if (best < INF && cur && nbrs(x).includes(cur) && heard[x][cur] && Math.min(INF, cost(x, cur) + heard[x][cur][y]) === best) nh = cur;
            row[y] = { d: best, nh: best < INF ? nh : null };
        }
        return row;
    };
    const loopOf = (t) => {
        for (const start of names) {
            const seen = [];
            let x = start;
            while (x && x !== dest && !seen.includes(x)) { seen.push(x); x = t[x][dest].nh; }
            if (x && x !== dest && seen.includes(x)) return seen.slice(seen.indexOf(x));
        }
        return null;
    };
    const runRound = (round, phase) => {
        const adv = advertise();
        /* A router's next distance to dest is in doubt only if a change in what
           it reads could matter: its current next hop's advertisement changed
           or the next hop is gone, or some neighbour whose advertisement changed
           now offers no more than the current distance. Anything else — no
           change, or a change that still cannot beat the current route — leaves
           it certain to stay put. */
        const inDoubt = {};
        for (const x of names) {
            const cur = Object.fromEntries(nbrs(x).map(v => [v, adv[v][x][dest]]));
            const prev = lastInputs[x];
            const { d, nh } = T[x][dest];
            let doubt = !prev;
            if (prev) {
                if (nh && !(nh in cur)) doubt = true;
                for (const v of Object.keys(cur)) {
                    if (prev[v] === cur[v]) continue;
                    if (v === nh || Math.min(INF, cost(x, v) + cur[v]) <= d) doubt = true;
                }
            }
            inDoubt[x] = doubt;
            lastInputs[x] = cur;
        }
        snap({ phase: 'send', stage: phase, round, adv, inDoubt, loop: loopOf(T),
            explanation: `Round ${round}: every router sends each neighbour its full distance vector${poison ? ', except that a route learned through a neighbour is advertised back to that neighbour as ∞ (poison reverse)' : ''}. The labels on the links are what each router claims about ${dest}.` });
        for (const x of names) { heard[x] = {}; for (const v of nbrs(x)) heard[x][v] = adv[v][x]; }
        const next = {};
        for (const x of names) next[x] = recompute(x, T[x]);
        const changed = [];
        for (const x of names) for (const y of names) {
            if (next[x][y].d !== T[x][y].d || next[x][y].nh !== T[x][y].nh) changed.push([x, y]);
        }
        const before = T;
        T = next;
        const focus = changed.filter(([, y]) => y === dest).map(([x]) => `${x}: ${show(before[x][dest].d)} → ${show(T[x][dest].d)}${T[x][dest].nh ? ` via ${T[x][dest].nh}` : ''}`);
        const loop = loopOf(T);
        let text;
        if (!changed.length) {
            text = `Round ${round}: no table changed. The routers have converged — a ${phase === 'after' ? 'new ' : ''}stable answer, found without any router ever seeing the whole network.`;
        } else {
            text = `Round ${round}: every router recomputes min over its neighbours of link cost + advertised distance. ${focus.length ? `Routes to ${dest}: ${focus.join('; ')}.` : `Nothing changes for ${dest}`}${changed.length > focus.length ? ` (${changed.length - focus.length} other entr${changed.length - focus.length > 1 ? 'ies' : 'y'} changed too.)` : ''}`;
            if (loop) text += ` Follow the arrows: ${loop.join(' → ')} → ${loop[0]} is a routing loop. Each of them believes the other still has a way to ${dest}, and each round they raise their estimates a little — counting to infinity.`;
        }
        snap({ phase: 'update', stage: phase, round, adv, changed, loop, converged: !changed.length, explanation: text });
        return changed.length > 0;
    };

    snap({ phase: 'init', stage: 'before', round: 0,
        explanation: `Each router starts knowing only its own links: the cost to each neighbour, ∞ to everyone else. No router has a map. The pink arrows will show each router's next hop towards ${dest}.` });
    let round = 0;
    while (round < 12) { round++; if (!runRound(round, 'before')) break; }
    const roundsBefore = round;

    // ── the link fails ──
    const [fa, fb] = topo.fail;
    edges = edges.filter(e => [e.a, e.b].sort().join('-') !== failKey);
    failed = failKey;
    delete heard[fa][fb];
    delete heard[fb][fa];
    const before = T;
    T = { ...T, [fa]: recompute(fa, T[fa]), [fb]: recompute(fb, T[fb]) };
    const failChanged = [];
    for (const x of [fa, fb]) for (const y of names) if (T[x][y].d !== before[x][y].d || T[x][y].nh !== before[x][y].nh) failChanged.push([x, y]);
    const endpoint = [fa, fb].find(x => x !== dest) ?? fa;
    snap({ phase: 'fail', stage: 'after', round, changed: failChanged, loop: loopOf(T),
        explanation: `The ${fa}–${fb} link fails. ${fa} and ${fb} notice at once and recompute from the vectors they last heard from their other neighbours. ${endpoint === dest ? '' : `${endpoint} now puts its route to ${dest} at ${show(T[endpoint][dest].d)}${T[endpoint][dest].nh ? ` via ${T[endpoint][dest].nh}` : ''}`}${endpoint !== dest && T[endpoint][dest].nh ? ` — but ${T[endpoint][dest].nh}'s old advertisement was itself a route through ${endpoint}. It is trusting stale news.` : endpoint !== dest ? ' — it has no other way there.' : ''}` });

    const failRound = round;
    let r2 = 0;
    while (r2 < 40) { r2++; round++; if (!runRound(round, 'after')) break; }
    const roundsAfter = round - failRound;
    const reach = T[endpoint === dest ? (fa === dest ? fb : fa) : endpoint][dest].d;
    snap({ phase: 'final', stage: 'after', round, roundsBefore, roundsAfter,
        explanation: `After the failure the network needed ${roundsAfter} round${roundsAfter > 1 ? 's' : ''} to settle${reach >= INF ? `, and ${dest} is correctly marked unreachable (16 = ∞)` : `, on a new route of cost ${reach}`}. Good news (a new short route) spreads one hop per round; bad news can take many, because routers keep believing neighbours whose own information came from them. ${poison ? 'Poison reverse removes the two-router version of that trap, but not a loop through three or more routers.' : 'Try the same failure with poison reverse turned on.'}` });
    return steps;
}

/* On a 'send' step the advertised distances to the destination are drawn on
   every link, so one router's next distance follows from what is on screen:
   the minimum over its neighbours of link cost + advertised value. Only
   routers whose inputs changed since their last recompute are asked about
   (step.inDoubt) — for the others "unchanged" is certain — rotating with the
   round among them. */
const predictFor = (step, next) => {
    if (!step || !next || step.phase !== 'send' || next.phase !== 'update') return null;
    const { dest, names, adv, round, tables } = step;
    // only routers whose inputs changed: for the rest "unchanged" is certain
    const candidates = names.filter(x => x !== dest && Object.keys(adv[x] ?? {}).length && step.inDoubt[x]);
    if (!candidates.length) return null;
    const x = candidates[round % candidates.length];
    const sums = Object.keys(adv[x]).map(v => {
        const cost = Number(step.costs[[x, v].sort().join('-')]);
        return Math.min(INF, cost + adv[v][x][dest]);
    });
    const now = tables[x][dest].d;
    const truth = next.tables[x][dest].d;
    const vals = [...new Set([truth, now, ...sums, Math.min(INF, now + 1)])].slice(0, 4).sort((a, b) => a - b);
    // Everything on screen already agrees (typically all ∞): nothing to decide.
    if (vals.length < 2) return null;
    const r = round % vals.length;
    const ordered = [...vals.slice(r), ...vals.slice(0, r)];
    return {
        question: `Round ${round}: these advertisements are on the wire. After ${x} reads them, what is its distance to ${dest}?`,
        options: ordered.map(v => (v >= INF ? '∞ (unreachable)' : v === now ? `${v} (unchanged)` : String(v))),
        correct: ordered.indexOf(truth),
        because: `${x} takes the minimum of link cost + advertised distance over its neighbours: ${Object.keys(adv[x]).map(v => `${v}: ${step.costs[[x, v].sort().join('-')]} + ${show(adv[v][x][dest])}`).join(', ')}. That is ${show(truth)}${truth >= INF ? ' — no neighbour offers a route' : ''}.`,
    };
};

const quizQuestions = [
    {
        question: 'Routers A–B–C–D sit in a line with cost-1 links, and C–D fails. Without poison reverse, why does it take many rounds for B and C to give up on D?',
        options: [
            'Their timers have to expire first',
            'C believes B\'s old advertisement (D at distance 2), not knowing that route went through C itself; they then raise each other\'s estimate a little each round',
            'Bellman-Ford needs V − 1 rounds no matter what',
            'D keeps advertising itself',
        ],
        correct: 1,
        explanation: 'A distance vector carries no path, so C cannot tell that B\'s distance 2 was via C. Each round they each add a link cost to the other\'s last claim — 3, 4, 5, … — until they reach the protocol\'s infinity (16 in RIP). That is count-to-infinity.',
    },
    {
        question: 'What does poison reverse do?',
        options: [
            'It removes a failed link from every routing table immediately',
            'If X routes to a destination through neighbour Y, X tells Y that destination is unreachable',
            'It doubles the cost of any link that failed recently',
            'It floods the failure to every router',
        ],
        correct: 1,
        explanation: 'Y should never route back through X for a destination X reaches through Y, so X advertises ∞ to Y for it. That kills two-router loops instantly. Loops through three or more routers can still count to infinity — the triangle preset shows one.',
    },
    {
        question: 'A router\'s neighbours advertise distances to Z of: N1 = 4 (link cost 2), N2 = 1 (link cost 6), N3 = 3 (link cost 3). What is its distance to Z?',
        options: ['1', '6', '7', '4'],
        correct: 1,
        explanation: 'Bellman-Ford takes the minimum of link cost + advertised distance: N1 gives 2 + 4 = 6, N2 gives 6 + 1 = 7, N3 gives 3 + 3 = 6. The minimum is 6 — the neighbour advertising the smallest distance is not necessarily the best next hop.',
    },
];

function QuizPanel({ quizState, setQuizState }) {
    const q = quizQuestions[quizState.current];
    if (quizState.complete) {
        return (
            <div className="text-center py-2">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{quizQuestions.length}</div>
                <div className="text-pink-300/80 text-sm mb-4">{quizState.score === quizQuestions.length ? 'Perfect — you could debug RIP.' : 'Run the chain with and without poison reverse, then retry.'}</div>
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
const R = 24;
function unit(ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; }

function RoutingStage({ step, topo }) {
    const { tables, dest, adv, failed, loop } = step;
    const P = topo.nodes;
    const loopSet = new Set(loop || []);
    return (
        <svg viewBox="0 0 760 350" width="100%" className="select-none">
            <style>{`.v-fade { transition: opacity .4s ease; } .v-node { transition: fill .4s ease, stroke .4s ease; }`}</style>
            <defs>
                <marker id="dvh" markerWidth="9" markerHeight="9" refX="7" refY="3.5" orient="auto" markerUnits="userSpaceOnUse">
                    <path d="M0,0 L7,3.5 L0,7 Z" fill="context-stroke" />
                </marker>
            </defs>

            {topo.edges.map(([a, b, c]) => {
                const key = [a, b].sort().join('-');
                const down = failed === key;
                const [ax, ay] = P[a], [bx, by] = P[b];
                const mx = (ax + bx) / 2, my = (ay + by) / 2;
                return (
                    <g key={key}>
                        <line x1={ax} y1={ay} x2={bx} y2={by} stroke={down ? '#7f1d1d' : '#475569'} strokeWidth={down ? 2 : 2.5} strokeDasharray={down ? '6 5' : undefined} />
                        <circle cx={mx} cy={my} r="10" fill="#0f172a" stroke={down ? '#ef4444' : '#334155'} />
                        <text x={mx} y={my + 3.5} textAnchor="middle" fontSize="10" fontWeight="700" fill={down ? '#fca5a5' : '#cbd5e1'} fontFamily="monospace">{down ? '×' : c}</text>
                    </g>
                );
            })}

            {/* next-hop arrows towards the destination */}
            {Object.keys(P).filter(x => x !== dest && tables[x][dest].nh).map(x => {
                const nh = tables[x][dest].nh;
                const [ax, ay] = P[x], [bx, by] = P[nh];
                const [ux, uy] = unit(ax, ay, bx, by);
                const off = 7;
                const sx = ax + ux * (R + 3) - uy * off, sy = ay + uy * (R + 3) + ux * off;
                const ex = ax + ux * Math.min(R + 46, Math.hypot(bx - ax, by - ay) * 0.42) - uy * off;
                const ey = ay + uy * Math.min(R + 46, Math.hypot(bx - ax, by - ay) * 0.42) + ux * off;
                const inLoop = loopSet.has(x);
                return <line key={`nh-${x}`} x1={sx} y1={sy} x2={ex} y2={ey} stroke={inLoop ? '#f87171' : '#f472b6'} strokeWidth="3.2" markerEnd="url(#dvh)" className="v-fade" />;
            })}

            {/* advertised distance to dest on each directed link */}
            {adv && Object.keys(adv).flatMap(x => Object.keys(adv[x]).map(v => {
                const [ax, ay] = P[x], [bx, by] = P[v];
                const [ux, uy] = unit(ax, ay, bx, by);
                const len = Math.hypot(bx - ax, by - ay);
                const t = Math.min(0.3, (R + 34) / len);
                const px = ax + (bx - ax) * t + uy * 15, py = ay + (by - ay) * t - ux * 15;
                const val = adv[x][v][dest];
                const poisoned = step.poison && tables[x][dest].nh === v;
                return (
                    <g key={`adv-${x}-${v}`} className="v-fade">
                        <rect x={px - 17} y={py - 9} width={34} height={17} rx="4" fill={poisoned ? '#450a0a' : '#1e1b2e'} stroke={poisoned ? '#f87171' : '#f9a8d4'} strokeWidth="1" />
                        <text x={px} y={py + 3.5} textAnchor="middle" fontSize="9.5" fontWeight="700" fill={poisoned ? '#fecaca' : '#fce7f3'} fontFamily="monospace">
                            {dest}:{show(val)}
                        </text>
                    </g>
                );
            }))}

            {Object.entries(P).map(([x, [cx, cy]]) => {
                const isDest = x === dest;
                const d = tables[x][dest].d;
                const changed = step.changed.some(([a, y]) => a === x && y === dest);
                return (
                    <g key={x}>
                        <circle cx={cx} cy={cy} r={R} className="v-node" fill={isDest ? '#831843' : changed ? '#713f12' : '#0f172a'}
                            stroke={isDest ? '#f472b6' : changed ? '#facc15' : loopSet.has(x) ? '#f87171' : '#64748b'} strokeWidth={isDest || changed ? 2.6 : 1.8} />
                        <text x={cx} y={cy + 5} textAnchor="middle" fontSize="15" fontWeight="700" fill="#f8fafc">{x}</text>
                        {!isDest && (
                            <text x={cx} y={cy + R + 15} textAnchor="middle" fontSize="10" fontFamily="monospace" fill={d >= INF ? '#f87171' : '#f9a8d4'}>
                                {dest}={show(d)}
                            </text>
                        )}
                        {isDest && <text x={cx} y={cy + R + 15} textAnchor="middle" fontSize="9" fill="#f472b6" fontFamily="monospace">destination</text>}
                    </g>
                );
            })}
        </svg>
    );
}

function TablesGrid({ step }) {
    const changed = new Set(step.changed.map(([x, y]) => `${x}${y}`));
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {step.names.map(x => (
                <div key={x} className="rounded-lg border border-slate-800 bg-slate-950/50 p-2">
                    <div className="text-xs font-bold text-slate-200 mb-1">Router {x}</div>
                    <div className="space-y-0.5 font-mono text-[10px]">
                        {step.names.filter(y => y !== x).map(y => {
                            const e = step.tables[x][y];
                            const hot = changed.has(`${x}${y}`);
                            return (
                                <div key={y} className={`flex justify-between gap-1 px-1 rounded ${hot ? 'bg-yellow-500/25 text-yellow-100' : y === step.dest ? 'text-pink-200' : 'text-slate-400'}`}>
                                    <span>→{y}</span>
                                    <span className={e.d >= INF ? 'text-red-400' : ''}>{show(e.d)}</span>
                                    <span className="text-slate-500 w-6 text-right">{e.nh ?? '—'}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}

/** A random connected graph on the pentagon: a spanning tree plus extra links. */
function randomTopology() {
    const names = Object.keys(PENTAGON);
    const order = [...names].sort(() => Math.random() - 0.5);
    const edges = [];
    const has = (a, b) => edges.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
    for (let i = 1; i < order.length; i++) {
        const a = order[i], b = order[Math.floor(Math.random() * i)];
        edges.push([a, b, 1 + Math.floor(Math.random() * 4)]);
    }
    const extra = 1 + Math.floor(Math.random() * 3);
    for (let k = 0; k < 20 && edges.length < 4 + extra; k++) {
        const a = names[Math.floor(Math.random() * 5)], b = names[Math.floor(Math.random() * 5)];
        if (a !== b && !has(a, b)) edges.push([a, b, 1 + Math.floor(Math.random() * 4)]);
    }
    const [fa, fb] = edges[Math.floor(Math.random() * edges.length)];
    return { id: 'random', label: 'Random', nodes: PENTAGON, edges, fail: [fa, fb], dest: Math.random() < 0.5 ? fa : fb };
}

const codeExample = `INF = 16                                   # RIP's infinity

def dv_round(routers, links, tables, poison=False):
    """One synchronous round of distance-vector routing.
    links[x] = {neighbour: cost}; tables[x][y] = (distance, next_hop)."""
    # 1. every router builds the vector it sends to each neighbour
    adverts = {
        (x, v): {y: INF if poison and tables[x][y][1] == v else tables[x][y][0]
                 for y in routers}
        for x in routers for v in links[x]
    }
    # 2. every router recomputes: min over neighbours of cost + their claim
    new = {}
    for x in routers:
        new[x] = {x: (0, None)}
        for y in routers:
            if y == x:
                continue
            best = min(((min(INF, c + adverts[(v, x)][y]), v)
                        for v, c in links[x].items()), default=(INF, None))
            new[x][y] = best if best[0] < INF else (INF, None)
    return new

# run rounds until no table changes: that is convergence`;

export default function DistanceVectorPage() {
    const [topo, setTopo] = useState(TOPOLOGIES[0]);
    const [poison, setPoison] = useState(false);
    const [dest, setDest] = useState(TOPOLOGIES[0].dest);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1100);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const stepHistory = useMemo(() => generateSteps({ topo, poison, dest }), [topo, poison, dest]);
    const recovery = useMemo(() => [false, true].map(p => {
        const st = generateSteps({ topo, poison: p, dest });
        return st[st.length - 1].roundsAfter;
    }), [topo, dest]);

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
    const loadTopo = (t) => { setTopo(t); setDest(t.dest); restart(); };
    const failStep = stepHistory.findIndex(s => s.phase === 'fail');

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-pink-500 to-rose-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/computer-networks" className="flex items-center text-white hover:text-pink-100 transition-colors mb-6 w-fit">
                        <ArrowLeft className="h-5 w-5 mr-2" />Back to Computer Networks
                    </Link>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Distance Vector Routing</h1>
                        <p className="text-lg text-pink-100 mb-6 max-w-3xl mx-auto">
                            No router sees the network. Each one trusts what its neighbours claim — which converges beautifully,
                            until a link fails and bad news has to count its way to infinity.
                        </p>
                        <div className="flex flex-wrap justify-center gap-3 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">D(x,y) = min c(x,v) + D_v(y)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">∞ = 16 (RIP)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">One round per exchange</div>
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
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mb-4">
                                <span className="text-xs text-slate-500 mr-1">Fix</span>
                                {[[false, 'None'], [true, 'Split horizon + poison reverse']].map(([p, label]) => (
                                    <button key={label} onClick={() => { setPoison(p); restart(); }}
                                        className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${poison === p ? 'bg-pink-500/20 border-pink-500/60 text-pink-200' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>{label}</button>
                                ))}
                                <span className="text-xs text-slate-500 ml-3 mr-1">Destination</span>
                                {Object.keys(topo.nodes).sort().map(n => (
                                    <button key={n} onClick={() => { setDest(n); restart(); }}
                                        className={`w-7 h-7 rounded text-xs font-bold border ${dest === n ? 'bg-pink-500/25 border-pink-500 text-pink-100' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>{n}</button>
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
                                <button onClick={() => { if (failStep >= 0) { setCurrentStep(failStep); setIsPlaying(false); } }}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors font-medium">
                                    <Unplug size={18} />Jump to failure
                                </button>
                                <PredictToggle predict={predict} accent="pink" />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2 text-slate-300">Animation Speed: {speed}ms</label>
                                <input type="range" min="200" max="2000" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-full max-w-md accent-pink-500" />
                            </div>
                            <div className="flex justify-between items-center mb-2 text-sm">
                                <span className="text-slate-300">Step {currentStep + 1} of {stepHistory.length}</span>
                                <span className={`text-xs font-mono ${step.stage === 'after' ? 'text-red-300' : 'text-slate-500'}`}>
                                    {step.phase === 'init' ? 'start' : `round ${step.round}`} · {step.stage === 'after' ? `${topo.fail.join('–')} down` : 'all links up'}
                                </span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-1.5 mb-4">
                                <div className="bg-pink-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${((currentStep + 1) / stepHistory.length) * 100}%` }} />
                            </div>

                            <div className="bg-slate-950/60 rounded-lg border border-slate-800 p-2">
                                <RoutingStage step={step} topo={topo} />
                            </div>
                            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
                                <span className="flex items-center gap-1.5"><span className="w-5 border-t-[3px] border-pink-400" />next hop to {dest}</span>
                                <span className="flex items-center gap-1.5"><span className="w-5 border-t-[3px] border-red-400" />routing loop</span>
                                <span className="flex items-center gap-1.5"><span className="px-1 rounded border border-pink-300 text-[9px] font-mono text-pink-100">{dest}:3</span>advertised to that neighbour</span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full border-2 border-yellow-400" />changed this round</span>
                            </div>

                            <div className="mt-4">
                                <TablesGrid step={step} />
                                <p className="text-[11px] text-slate-600 mt-1.5">Each row: destination, distance, next hop.</p>
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
                                <Share2 className="h-5 w-5 text-pink-400" />
                                <h3 className="font-bold text-white">Rounds to Recover</h3>
                            </div>
                            <div className="space-y-2 text-sm">
                                {[['No fix', recovery[0], !poison], ['Poison reverse', recovery[1], poison]].map(([label, n, on]) => (
                                    <div key={label} className={`flex justify-between px-2 py-1.5 rounded-lg ${on ? 'bg-pink-500/15 text-pink-200' : 'text-slate-400'}`}>
                                        <span>{label}</span><span className="font-mono">{n} round{n === 1 ? '' : 's'}</span>
                                    </div>
                                ))}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
                                Same network, same failure, destination {dest}. On the chain poison reverse ends the loop at once; on
                                the triangle the loop runs through three routers and it does not help at all. This is why RIP caps
                                networks at 15 hops — infinity has to be small enough to count to.
                            </p>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">Knowledge Check</h3>
                            <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <button onClick={() => setShowCode(c => !c)} className="flex items-center gap-2 text-pink-400 hover:text-pink-300 font-medium">
                                <Code2 className="h-5 w-5" />{showCode ? 'Hide' : 'Show'} Python: one Bellman-Ford round
                            </button>
                            {showCode && <div className="mt-4"><CodeBlock code={codeExample} language="python" /></div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
