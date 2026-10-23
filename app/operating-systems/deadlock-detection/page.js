"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Info, Code2, Shuffle, Waypoints, Check, X, CircleDot } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

const quizQuestions = [
    {
        question: 'Every resource has exactly one instance. The wait-for graph has a cycle. What can you conclude?',
        options: [
            'Deadlock is possible but not certain',
            'The processes on the cycle are deadlocked',
            'Every process in the system is deadlocked',
            'Nothing — cycles only matter with multiple instances',
        ],
        correct: 1,
        explanation: 'With single-instance resources a cycle is both necessary and sufficient: each process on it waits for the next, and none can ever release. With multiple instances a cycle is necessary but not sufficient, and detection needs a Banker-style algorithm instead.',
    },
    {
        question: 'During depth-first search, which edge proves the graph has a cycle?',
        options: [
            'An edge to a node that has not been visited yet',
            'An edge to a node that is already finished',
            'An edge to a node still on the recursion stack',
            'Any edge out of the start node',
        ],
        correct: 2,
        explanation: 'A node on the stack (gray) is an ancestor of the current node, so an edge back to it closes a loop. An edge to a finished (black) node only reaches a part of the graph already shown to be cycle-free from there.',
    },
    {
        question: 'Requiring every thread to acquire locks in one global order prevents deadlock by breaking which Coffman condition?',
        options: ['Mutual exclusion', 'Hold and wait', 'No preemption', 'Circular wait'],
        correct: 3,
        explanation: 'If every edge of the wait-for graph points from a lower-ranked lock holder to a higher-ranked one, the graph can never loop back. Mutual exclusion, hold-and-wait and no preemption can all still be present.',
    },
];

const P = (i) => `P${i + 1}`;
const R = (i) => `R${i + 1}`;

/* holder[r] = process holding resource r (one instance each), or null.
   requests = [process, resource] pairs: a process blocked waiting for that resource. */
const PRESETS = [
    { name: 'Deadlock', procs: 4, holder: [0, 1, 2, 3], requests: [[0, 1], [1, 2], [2, 0], [3, 1]] },
    { name: 'No deadlock', procs: 4, holder: [0, 1, 2, null], requests: [[0, 1], [1, 2], [3, 0]] },
    { name: 'Two cycles', procs: 5, holder: [0, 1, 2, 3, 4], requests: [[0, 1], [1, 0], [2, 3], [3, 4], [4, 2]] },
];

function generateSteps(sc) {
    const n = sc.procs;
    const k = sc.holder.length;
    const reqs = [...sc.requests].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const adj = Array.from({ length: n }, () => []);
    const wfg = [];
    const color = Array(n).fill('white');
    const stack = [];
    const cycles = [];
    const steps = [];
    let edgeNo = 0;
    const holdWait = [...new Set(reqs.map(([p]) => p))].filter(p => sc.holder.includes(p)).sort((a, b) => a - b);

    const snap = (extra) => ({
        sc, holdWait,
        wfg: wfg.map(e => ({ ...e })),
        color: [...color], stack: [...stack], cycles: cycles.map(c => [...c]),
        focusReq: null, newEdge: null, active: null, verdict: null, edgeNo,
        ...extra,
    });

    steps.push(snap({
        act: 1, phase: 'rag',
        explanation: `The resource-allocation graph: ${n} processes (circles), ${k} single-instance resources (squares). A solid arrow R → P means P holds R; a dashed arrow P → R means P is blocked waiting for R.${holdWait.length ? ` ${holdWait.map(P).join(', ')} hold one resource while waiting for another.` : ''}`,
    }));

    reqs.forEach(([p, r], i) => {
        steps.push(snap({
            act: 2, phase: 'focus', focusReq: i,
            explanation: `${P(p)} is waiting for ${R(r)}. To build the wait-for graph, replace the resource with whoever holds it.`,
        }));
        const q = sc.holder[r];
        const exists = wfg.some(e => e.from === p && e.to === q);
        if (!exists) {
            wfg.push({ from: p, to: q, via: [r] });
            adj[p].push(q);
        } else {
            wfg.find(e => e.from === p && e.to === q).via.push(r);
        }
        steps.push(snap({
            act: 2, phase: 'collapse', focusReq: i, newEdge: { from: p, to: q },
            explanation: `${R(r)} is held by ${P(q)}, so ${P(p)} waits for ${P(q)}: edge ${P(p)} → ${P(q)}${exists ? ' (already present via another resource)' : ''}.`,
        }));
    });

    adj.forEach(list => list.sort((a, b) => a - b));
    steps.push(snap({
        act: 3, phase: 'dfs-start',
        explanation: `The wait-for graph has ${wfg.length} edge${wfg.length === 1 ? '' : 's'}. Depth-first search colours nodes white (unvisited), yellow (on the current path) and dark (finished). An edge back to a yellow node closes a cycle. Processes that wait on nobody cannot be on a cycle, so no search starts from them.`,
    }));

    const dfs = (u) => {
        color[u] = 'gray';
        stack.push(u);
        steps.push(snap({ act: 3, phase: 'visit', active: { node: u }, explanation: `Visit ${P(u)}: it joins the current path ${stack.map(P).join(' → ')}.` }));
        for (const v of adj[u]) {
            edgeNo++;
            steps.push(snap({ act: 3, phase: 'edge', active: { from: u, to: v }, explanation: `${P(u)} waits for ${P(v)}. Follow the edge ${P(u)} → ${P(v)} and check ${P(v)}'s colour.` }));
            if (color[v] === 'white') {
                dfs(v);
                steps.push(snap({ act: 3, phase: 'return', active: { node: u }, explanation: `Back at ${P(u)} after exploring ${P(v)}.` }));
            } else if (color[v] === 'gray') {
                const cyc = stack.slice(stack.indexOf(v));
                cycles.push(cyc);
                steps.push(snap({
                    act: 3, phase: 'cycle', active: { from: u, to: v },
                    explanation: `${P(v)} is still on the current path, so this is a back edge: ${[...cyc, v].map(P).join(' → ')} is a cycle. Each waits for the next and none can release — deadlock.`,
                }));
            } else {
                steps.push(snap({ act: 3, phase: 'skip', active: { from: u, to: v }, explanation: `${P(v)} is already finished — everything reachable from it was explored before. No new cycle through there; skip it.` }));
            }
        }
        color[u] = 'black';
        stack.pop();
        steps.push(snap({ act: 3, phase: 'finish', active: { node: u }, explanation: `${P(u)} has no more edges to follow. Mark it finished and pop it off the path.` }));
    };
    // A process that waits on nobody cannot be on a cycle, so searches only
    // start from processes with an outgoing edge.
    for (let s = 0; s < n; s++) {
        if (color[s] !== 'white' || adj[s].length === 0) continue;
        dfs(s);
    }

    // Verdict: on a cycle, stuck behind one, or free to finish.
    const reach = (from) => {
        const seen = new Set();
        const todo = [...adj[from]];
        while (todo.length) { const x = todo.pop(); if (seen.has(x)) continue; seen.add(x); todo.push(...adj[x]); }
        return seen;
    };
    const onCycle = Array.from({ length: n }, (_, i) => reach(i).has(i));
    const verdict = Array.from({ length: n }, (_, i) => {
        if (onCycle[i]) return 'deadlocked';
        return [...reach(i)].some(j => onCycle[j]) ? 'stuck' : 'free';
    });
    const list = (kind) => verdict.map((v, i) => (v === kind ? P(i) : null)).filter(Boolean);
    const dead = list('deadlocked');
    const stuck = list('stuck');
    const free = list('free');
    let text;
    if (!dead.length) {
        text = `No cycle: the system is not deadlocked. ${free.join(', ')} can all finish — whoever waits on nobody runs first, releases, and unblocks the next.`;
    } else {
        text = `Deadlocked: ${dead.join(', ')}.${stuck.length ? ` ${stuck.join(', ')} ${stuck.length === 1 ? 'is' : 'are'} not on a cycle but wait${stuck.length === 1 ? 's' : ''} on it, so ${stuck.length === 1 ? 'it is' : 'they are'} stuck too.` : ''}${free.length ? ` ${free.join(', ')} can still finish.` : ''} Recovery means aborting a process on each cycle or preempting a resource from one.`;
    }
    steps.push(snap({ act: 4, phase: 'verdict', verdict, explanation: text }));
    return steps;
}

/* Two kinds of decision, both readable off the screen:
   - collapsing a request edge: the RAG shows who holds the resource;
   - following a wait-for edge in DFS: the target's colour decides.
   Options are rotated so that no fixed button position is always right. */
function predictFor(step, next) {
    if (!step || !next) return null;
    if (step.phase === 'focus' && next.phase === 'collapse') {
        const [p, r] = [...step.sc.requests].sort((a, b) => a[0] - b[0] || a[1] - b[1])[step.focusReq];
        const others = Array.from({ length: step.sc.procs }, (_, i) => i).filter(i => i !== p);
        if (others.length < 2) return null;     // only one other process: nothing to decide
        const shift = step.focusReq % others.length;
        const order = [...others.slice(shift), ...others.slice(0, shift)];
        const options = order.map(q => `${P(p)} → ${P(q)}`);
        const q = next.newEdge.to;
        return {
            question: `${P(p)} is waiting for ${R(r)}. Which wait-for edge does that become?`,
            options,
            correct: options.indexOf(`${P(p)} → ${P(q)}`),
            because: `The solid arrow out of ${R(r)} points to its holder, ${P(q)} — so ${P(p)} is really waiting for ${P(q)}.`,
        };
    }
    if (step.phase === 'edge') {
        const { to } = step.active;
        const base = [`Descend into ${P(to)}`, 'Back edge — a cycle', `Skip ${P(to)}`];
        // Not edgeNo alone: the first edge of a search is nearly always a
        // descend, which pinned that answer to one button.
        const shift = (step.edgeNo + step.active.from + 2 * to) % 3;
        const options = [...base.slice(shift), ...base.slice(0, shift)];
        let label;
        let because;
        if (next.phase === 'visit') { label = base[0]; because = `${P(to)} is white — not visited yet — so the search goes deeper.`; }
        else if (next.phase === 'cycle') { label = base[1]; because = `${P(to)} is yellow: it is on the current path, so the edge loops back to an ancestor.`; }
        else if (next.phase === 'skip') { label = base[2]; because = `${P(to)} is dark: already finished, with no cycle reachable through it that was not already found.`; }
        else return null;
        return {
            question: `Following ${P(step.active.from)} → ${P(to)}. What does the search do?`,
            options,
            correct: options.indexOf(label),
            because,
        };
    }
    return null;
}

const randomScenario = () => {
    const n = 4 + Math.floor(Math.random() * 2);
    const k = n;
    const holder = Array.from({ length: k }, () => (Math.random() < 0.85 ? Math.floor(Math.random() * n) : null));
    const requests = [];
    for (let p = 0; p < n; p++) {
        if (Math.random() < 0.25) continue;
        const options = holder.map((h, r) => (h !== null && h !== p ? r : null)).filter(r => r !== null);
        if (options.length) requests.push([p, options[Math.floor(Math.random() * options.length)]]);
    }
    return { name: 'Random', procs: n, holder, requests };
};

const STROKE = { base: '#64748b', hold: '#94a3b8', req: '#f59e0b', hot: '#facc15', red: '#f87171', green: '#4ade80' };

function Markers({ prefix }) {
    return (
        <defs>
            {Object.entries(STROKE).map(([k, c]) => (
                <marker key={k} id={`${prefix}-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill={c} />
                </marker>
            ))}
        </defs>
    );
}

/* Shorten a segment so it starts and ends at the node boundaries. */
function trim(x1, y1, x2, y2, r1, r2) {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    return [x1 + (dx * r1) / len, y1 + (dy * r1) / len, x2 - (dx * r2) / len, y2 - (dy * r2) / len];
}

function RagView({ step }) {
    const { sc } = step;
    const W = 380, H = 230;
    const n = sc.procs, k = sc.holder.length;
    const px = (i) => 40 + (i * (W - 80)) / Math.max(n - 1, 1);
    const rx = (j) => 40 + (j * (W - 80)) / Math.max(k - 1, 1);
    const PY = 48, RY = 182;
    const reqs = [...sc.requests].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const focus = step.focusReq !== null ? reqs[step.focusReq] : null;
    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%">
            <Markers prefix="rag" />
            {/* assignment edges R -> P */}
            {sc.holder.map((h, j) => {
                if (h === null) return null;
                const hot = focus && focus[1] === j && step.phase === 'collapse';
                const [a, b, c, d] = trim(rx(j), RY, px(h), PY, 18, 20);
                return <line key={`h${j}`} x1={a} y1={b} x2={c} y2={d} stroke={hot ? STROKE.hot : STROKE.hold} strokeWidth={hot ? 2.5 : 1.6} markerEnd={`url(#rag-${hot ? 'hot' : 'hold'})`} />;
            })}
            {/* request edges P -> R */}
            {reqs.map(([p, r], i) => {
                const hot = step.focusReq === i;
                const [a, b, c, d] = trim(px(p), PY, rx(r), RY, 20, 18);
                return <line key={`r${i}`} x1={a} y1={b} x2={c} y2={d} stroke={hot ? STROKE.hot : STROKE.req} strokeWidth={hot ? 2.5 : 1.6} strokeDasharray="5 4" markerEnd={`url(#rag-${hot ? 'hot' : 'req'})`} />;
            })}
            {Array.from({ length: n }).map((_, i) => {
                const hw = step.holdWait.includes(i);
                return (
                    <g key={`p${i}`}>
                        {hw && <circle cx={px(i)} cy={PY} r="25" fill="none" stroke="#f59e0b" strokeOpacity="0.45" strokeDasharray="2 3" />}
                        <circle cx={px(i)} cy={PY} r="18" fill="#1e293b" stroke={focus && (focus[0] === i || (step.phase === 'collapse' && sc.holder[focus[1]] === i)) ? STROKE.hot : '#64748b'} strokeWidth="2" />
                        <text x={px(i)} y={PY + 4} textAnchor="middle" fontSize="12" fontWeight="700" fill="#e2e8f0">{P(i)}</text>
                    </g>
                );
            })}
            {sc.holder.map((h, j) => (
                <g key={`res${j}`}>
                    <rect x={rx(j) - 17} y={RY - 17} width="34" height="34" rx="5" fill="#0f172a" stroke={focus && focus[1] === j ? STROKE.hot : '#475569'} strokeWidth="2" />
                    <circle cx={rx(j)} cy={RY - 5} r="3.5" fill={h === null ? '#475569' : '#e2e8f0'} />
                    <text x={rx(j)} y={RY + 11} textAnchor="middle" fontSize="10" fontWeight="700" fill="#94a3b8">{R(j)}</text>
                </g>
            ))}
        </svg>
    );
}

function WfgView({ step }) {
    const n = step.sc.procs;
    const W = 300, H = 230, cx = 150, cy = 115, rad = 82;
    const pos = (i) => {
        const a = (-90 + (i * 360) / n) * (Math.PI / 180);
        return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
    };
    const onCycleEdge = (u, v) => step.cycles.some(c => c.some((x, i) => x === u && c[(i + 1) % c.length] === v));
    const inCycle = (u) => step.cycles.some(c => c.includes(u));
    const nodeStyle = (i) => {
        if (step.verdict) {
            if (step.verdict[i] === 'deadlocked') return { fill: 'rgba(239,68,68,0.25)', stroke: STROKE.red };
            if (step.verdict[i] === 'stuck') return { fill: 'rgba(245,158,11,0.2)', stroke: '#f59e0b' };
            return { fill: 'rgba(74,222,128,0.15)', stroke: STROKE.green };
        }
        if (inCycle(i)) return { fill: 'rgba(239,68,68,0.25)', stroke: STROKE.red };
        if (step.color[i] === 'gray') return { fill: 'rgba(250,204,21,0.25)', stroke: STROKE.hot };
        if (step.color[i] === 'black') return { fill: '#020617', stroke: '#475569' };
        return { fill: '#1e293b', stroke: '#64748b' };
    };
    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%">
            <Markers prefix="wfg" />
            {step.wfg.map((e, i) => {
                const [x1, y1] = pos(e.from);
                const [x2, y2] = pos(e.to);
                const isNew = step.newEdge && step.newEdge.from === e.from && step.newEdge.to === e.to;
                const isActive = step.active && step.active.from === e.from && step.active.to === e.to;
                const cyc = onCycleEdge(e.from, e.to);
                const tone = cyc ? 'red' : isActive || isNew ? 'hot' : 'base';
                // bend every edge a little, so u->v and v->u do not overlap
                const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
                const len = Math.hypot(x2 - x1, y2 - y1) || 1;
                const qx = mx + (-(y2 - y1) / len) * 16, qy = my + ((x2 - x1) / len) * 16;
                const [a, b] = trim(x1, y1, qx, qy, 20, 0);
                const [, , c, d] = trim(qx, qy, x2, y2, 0, 21);
                return (
                    <path key={i} d={`M ${a} ${b} Q ${qx} ${qy} ${c} ${d}`} fill="none" stroke={STROKE[tone]}
                        strokeWidth={tone === 'base' ? 1.6 : 2.6} markerEnd={`url(#wfg-${tone})`} style={{ transition: 'stroke 0.3s ease' }} />
                );
            })}
            {Array.from({ length: n }).map((_, i) => {
                const [x, y] = pos(i);
                const st = nodeStyle(i);
                const focused = step.active && step.active.node === i;
                return (
                    <g key={i}>
                        {focused && <circle cx={x} cy={y} r="25" fill="none" stroke={STROKE.hot} strokeWidth="1.5" strokeDasharray="3 3" />}
                        <circle cx={x} cy={y} r="18" fill={st.fill} stroke={st.stroke} strokeWidth="2.2" style={{ transition: 'fill 0.3s ease, stroke 0.3s ease' }} />
                        <text x={x} y={y + 4} textAnchor="middle" fontSize="12" fontWeight="700" fill="#e2e8f0">{P(i)}</text>
                    </g>
                );
            })}
        </svg>
    );
}

function QuizPanel({ quizState, setQuizState }) {
    const q = quizQuestions[quizState.current];
    const answer = (i) => {
        if (quizState.answered) return;
        setQuizState(s => ({ ...s, selected: i, answered: true, score: i === q.correct ? s.score + 1 : s.score }));
    };
    const next = () => {
        if (quizState.current + 1 >= quizQuestions.length) setQuizState(s => ({ ...s, complete: true }));
        else setQuizState(s => ({ ...s, current: s.current + 1, selected: null, answered: false }));
    };
    if (quizState.complete) {
        return (
            <div className="text-center">
                <p className="text-2xl font-bold text-white mb-2">{quizState.score}/{quizQuestions.length}</p>
                <p className="text-slate-400 mb-4">{quizState.score === quizQuestions.length ? 'Perfect score!' : 'Keep practicing!'}</p>
                <button onClick={() => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false })}
                    className="px-4 py-2 bg-yellow-500 text-slate-950 rounded-lg hover:bg-yellow-400 transition-colors text-sm font-medium">Try Again</button>
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
                    if (!quizState.answered) cls += 'border-slate-600 text-slate-300 hover:border-yellow-500 hover:text-white bg-slate-800/50';
                    else if (i === q.correct) cls += 'border-green-500 bg-green-500/10 text-green-300';
                    else if (i === quizState.selected) cls += 'border-red-500 bg-red-500/10 text-red-300';
                    else cls += 'border-slate-700 text-slate-500 bg-slate-800/30';
                    return <button key={i} onClick={() => answer(i)} className={cls}>{opt}</button>;
                })}
            </div>
            {quizState.answered && (
                <div className="mt-3">
                    <p className="text-xs text-slate-400 mb-3">{q.explanation}</p>
                    <button onClick={next} className="px-4 py-2 bg-yellow-500 text-slate-950 rounded-lg hover:bg-yellow-400 transition-colors text-sm font-medium">
                        {quizState.current < quizQuestions.length - 1 ? 'Next Question' : 'See Results'}
                    </button>
                </div>
            )}
        </div>
    );
}

const codeExample = `def wait_for_graph(holder, requests):
    """holder: resource -> process holding it (single instance).
    requests: (process, resource) pairs for blocked processes."""
    graph = {}
    for p, r in requests:
        q = holder.get(r)
        if q is not None and q != p:
            graph.setdefault(p, set()).add(q)    # p waits for q
    return graph

def find_cycle(graph):
    WHITE, GRAY, BLACK = 0, 1, 2
    color, path = {}, []

    def dfs(u):
        color[u] = GRAY
        path.append(u)
        for v in sorted(graph.get(u, ())):
            c = color.get(v, WHITE)
            if c == GRAY:                         # back edge: v is on the path
                return path[path.index(v):]
            if c == WHITE and (cycle := dfs(v)):
                return cycle
        color[u] = BLACK                          # finished, no cycle below
        path.pop()
        return None

    for u in sorted(graph):
        if color.get(u, WHITE) == WHITE and (cycle := dfs(u)):
            return cycle                          # these processes are deadlocked
    return None`;

const ACTS = [
    { id: 1, label: 'Allocation graph' },
    { id: 2, label: 'Collapse to wait-for' },
    { id: 3, label: 'Search for a cycle' },
    { id: 4, label: 'Verdict' },
];

const DeadlockDetectionPage = () => {
    const [scenario, setScenario] = useState(PRESETS[0]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1000);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    useEffect(() => {
        setStepHistory(generateSteps(scenario));
        setCurrentStep(0);
        setIsPlaying(false);
    }, [scenario]);

    useEffect(() => {
        if (!isPlaying || stepHistory.length === 0) return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const pauseForPredict = useCallback(() => setIsPlaying(false), []);
    const predict = usePredict(stepHistory, currentStep, predictFor, pauseForPredict);
    // New input means new steps; answers are keyed by step index and no longer apply.
    const resetPredict = predict.reset;
    useEffect(() => { resetPredict(); }, [stepHistory, resetPredict]);

    const step = stepHistory[currentStep];
    if (!step) return <div className="min-h-screen bg-slate-950" />;
    const hidden = predict.hideExplanation;
    const cycleFound = step.cycles.length > 0;
    const finished = step.phase === 'verdict';

    const coffman = [
        { name: 'Mutual exclusion', holds: true, evidence: 'Each square has one instance, and at most one solid arrow leaves it.' },
        { name: 'Hold and wait', holds: step.holdWait.length > 0, evidence: step.holdWait.length ? `${step.holdWait.map(P).join(', ')} hold a resource while waiting (dotted rings).` : 'No process holds one resource while waiting for another.' },
        { name: 'No preemption', holds: true, evidence: 'Solid arrows stay until the holder releases; the OS never takes them back.' },
        {
            name: 'Circular wait',
            holds: cycleFound ? true : finished ? false : null,
            evidence: cycleFound
                ? step.cycles.map(c => [...c, c[0]].map(P).join(' → ')).join('; ')
                : finished ? 'The wait-for graph is acyclic.' : 'Unknown until the search finds a back edge.',
        },
    ];

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex items-center mb-6">
                        <Link href="/operating-systems" className="flex items-center text-white hover:text-yellow-100 transition-colors mr-4">
                            <ArrowLeft className="h-5 w-5 mr-2" />Back to Operating Systems
                        </Link>
                    </div>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4 flex items-center justify-center gap-3">
                            <Waypoints className="h-10 w-10" />Deadlock Detection
                        </h1>
                        <p className="text-xl text-yellow-50 mb-6 max-w-3xl mx-auto">
                            Let processes request freely, and every so often check whether anyone is stuck for good: collapse the resource-allocation graph into a wait-for graph and search it for a cycle.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Single-instance resources</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">DFS: O(V + E)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Cycle ⇔ deadlock</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <div className="flex flex-wrap gap-3 mb-4">
                                <button onClick={() => setIsPlaying(p => !p)} disabled={currentStep >= stepHistory.length - 1 && !isPlaying}
                                    className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-slate-950 rounded-lg hover:bg-yellow-400 transition-colors font-medium disabled:opacity-50">
                                    {isPlaying ? <Pause size={18} /> : <Play size={18} />}{isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={() => setCurrentStep(s => Math.max(0, s - 1))} disabled={isPlaying || currentStep === 0}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium disabled:opacity-50">
                                    <SkipBack size={18} />Step Back
                                </button>
                                <button onClick={() => setCurrentStep(s => Math.min(stepHistory.length - 1, s + 1))} disabled={isPlaying || currentStep >= stepHistory.length - 1}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50">
                                    <SkipForward size={18} />Step Forward
                                </button>
                                <button onClick={() => { setIsPlaying(false); setCurrentStep(0); predict.reset(); }}
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium">
                                    <RotateCcw size={18} />Reset
                                </button>
                                <button onClick={() => setScenario(randomScenario())}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium">
                                    <Shuffle size={18} />Randomize
                                </button>
                                <PredictToggle predict={predict} accent="yellow" />
                            </div>

                            <div className="flex flex-wrap items-center gap-2 mb-4">
                                <span className="text-xs text-slate-500 mr-1">Scenarios:</span>
                                {PRESETS.map(p => (
                                    <button key={p.name} onClick={() => setScenario(p)}
                                        className={`px-3 py-1 text-xs rounded-full border transition-colors ${scenario.name === p.name ? 'border-yellow-500/70 text-yellow-200 bg-yellow-500/10' : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-yellow-500/60'}`}>
                                        {p.name}
                                    </button>
                                ))}
                            </div>

                            <div className="mb-5">
                                <label className="block text-sm font-medium mb-2 text-slate-300">Animation Speed: {speed}ms</label>
                                <input type="range" min="200" max="2000" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-full max-w-md accent-yellow-500" />
                            </div>

                            {/* Act chips */}
                            <div className="flex flex-wrap gap-2 mb-2">
                                {ACTS.map(a => (
                                    <button key={a.id}
                                        onClick={() => { setIsPlaying(false); setCurrentStep(Math.max(0, stepHistory.findIndex(s => s.act === a.id))); }}
                                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${step.act === a.id
                                            ? 'bg-yellow-500/20 text-yellow-200 border-yellow-500/50'
                                            : step.act > a.id ? 'bg-slate-800 text-slate-400 border-slate-700' : 'text-slate-600 border-slate-800'}`}>
                                        {a.id}. {a.label}
                                    </button>
                                ))}
                            </div>
                            <div className="mb-2 flex justify-between items-center">
                                <span className="text-sm font-medium text-slate-300">Step {currentStep + 1} of {stepHistory.length}</span>
                                <span className="text-sm text-slate-500">{step.phase}</span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-2 mb-5">
                                <div className="bg-yellow-500 h-2 rounded-full transition-all duration-300" style={{ width: `${((currentStep + 1) / stepHistory.length) * 100}%` }} />
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/60">
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className="text-sm font-semibold text-slate-300">Resource-allocation graph</h3>
                                        <span className="text-[10px] text-slate-500">solid: holds · dashed: waits</span>
                                    </div>
                                    <RagView step={step} />
                                </div>
                                <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/60">
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className="text-sm font-semibold text-slate-300">Wait-for graph</h3>
                                        <span className="text-[10px] text-slate-500">{step.wfg.length} edge{step.wfg.length === 1 ? '' : 's'}</span>
                                    </div>
                                    <WfgView step={step} />
                                </div>
                            </div>

                            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                                {step.verdict ? (
                                    <>
                                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500/40 border border-red-400" />deadlocked</span>
                                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500/30 border border-amber-400" />stuck behind a cycle</span>
                                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500/20 border border-green-400" />can finish</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-800 border border-slate-500" />unvisited</span>
                                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-yellow-400/30 border border-yellow-300" />on current path</span>
                                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-950 border border-slate-600" />finished</span>
                                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500/40 border border-red-400" />on a cycle</span>
                                    </>
                                )}
                                <span className="ml-auto font-mono text-slate-500">path: {step.stack.length ? step.stack.map(P).join(' → ') : '—'}</span>
                            </div>

                            {predict.prompt && (
                                <div className="mt-5">
                                    <PredictPrompt predict={predict} accent="yellow" />
                                </div>
                            )}

                            <div className="mt-5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                                <div className="flex items-start gap-2">
                                    <Info className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-yellow-200 text-sm leading-relaxed">
                                        {hidden ? 'Make your prediction above to reveal this step.' : step.explanation}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Coffman conditions */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-1">The four Coffman conditions — on this graph</h3>
                            <p className="text-xs text-slate-500 mb-4">Deadlock needs all four at once. Break any one and it cannot happen.</p>
                            <div className="grid sm:grid-cols-2 gap-3">
                                {coffman.map((c, i) => (
                                    <div key={c.name} className={`p-3 rounded-lg border transition-colors ${c.holds === true ? 'border-red-500/40 bg-red-500/5' : c.holds === false ? 'border-green-500/40 bg-green-500/5' : 'border-slate-700 bg-slate-800/30'}`}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-semibold text-slate-100">{i + 1}. {c.name}</span>
                                            {c.holds === true && <span className="flex items-center gap-1 text-[11px] text-red-300"><Check className="h-3.5 w-3.5" />holds</span>}
                                            {c.holds === false && <span className="flex items-center gap-1 text-[11px] text-green-300"><X className="h-3.5 w-3.5" />absent</span>}
                                            {c.holds === null && <span className="flex items-center gap-1 text-[11px] text-slate-500"><CircleDot className="h-3.5 w-3.5" />checking</span>}
                                        </div>
                                        <p className="text-xs text-slate-400 leading-relaxed">{c.evidence}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-3">Detection vs the Alternatives</h3>
                            <ul className="space-y-3 text-sm text-slate-300">
                                <li><span className="text-yellow-300 font-semibold">Prevention</span> breaks a Coffman condition by design — e.g. a global lock order removes circular wait.</li>
                                <li><span className="text-yellow-300 font-semibold">Avoidance</span> (the Banker&apos;s algorithm) refuses any request that could lead to an unsafe state.</li>
                                <li><span className="text-yellow-300 font-semibold">Detection</span> lets requests through, periodically looks for a cycle, and recovers by aborting or preempting.</li>
                                <li><span className="text-yellow-300 font-semibold">Ignoring it</span> is what most desktop kernels do: deadlocks are rare and a reboot is cheap.</li>
                            </ul>
                            <div className="mt-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700/60 text-xs text-slate-400 leading-relaxed">
                                Databases are the big exception: they detect lock cycles all the time and abort one transaction as the &quot;victim&quot;.
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">Knowledge Check</h3>
                            <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <button onClick={() => setShowCode(c => !c)} className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300 font-medium">
                                <Code2 className="h-5 w-5" />{showCode ? 'Hide' : 'Show'} Python Code
                            </button>
                            {showCode && <div className="mt-4"><CodeBlock code={codeExample} language="python" /></div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeadlockDetectionPage;
