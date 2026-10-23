"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, RotateCcw, SkipForward, SkipBack, Shuffle, Info, Code2, Zap, BarChart3,
} from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── Model ───────────────────────────────────────────────────────────────────
   One connection, one packet leaving the server per tick, DELAY ticks to
   reach the browser. Each resource is a few packets ("chunks") and needs
   `think` ticks of server work after its request arrives. A lost packet is
   noticed about one round trip later and resent ahead of new data.
     HTTP/1.1 — one request at a time: the next request goes out only when the
                previous response has fully arrived.
     HTTP/2   — every request at once, responses interleaved as streams on one
                TCP connection; TCP hands bytes over strictly in order.
     HTTP/3   — the same streams over QUIC (UDP); ordering is per stream. */
const DELAY = 3;
const RETX_AFTER = 2 * DELAY;
const VERSIONS = [
    { id: 'h1', label: 'HTTP/1.1' },
    { id: 'h2', label: 'HTTP/2' },
    { id: 'h3', label: 'HTTP/3' },
];
const COLORS = ['#f472b6', '#38bdf8', '#fbbf24', '#4ade80', '#a78bfa'];
const PRESETS = [
    { id: 'slow', label: 'Slow first response', losses: [],
        resources: [{ name: 'report.json', size: 2, think: 7 }, { name: 'style.css', size: 3, think: 0 }, { name: 'app.js', size: 4, think: 0 }, { name: 'logo.png', size: 3, think: 0 }] },
    { id: 'loss', label: 'One lost packet', losses: [{ stream: 1, chunk: 1 }],
        resources: [{ name: 'style.css', size: 3, think: 0 }, { name: 'app.js', size: 4, think: 0 }, { name: 'logo.png', size: 3, think: 0 }, { name: 'font.woff2', size: 2, think: 0 }] },
    { id: 'both', label: 'Slow response and a loss', losses: [{ stream: 2, chunk: 0 }],
        resources: [{ name: 'report.json', size: 2, think: 6 }, { name: 'style.css', size: 3, think: 0 }, { name: 'app.js', size: 3, think: 0 }, { name: 'logo.png', size: 3, think: 0 }] },
];

function generateSteps({ version, resources, losses }) {
    const n = resources.length;
    const steps = [];
    const sent = resources.map(() => 0);
    const received = resources.map(r => Array(r.size).fill(false));
    const delivered = resources.map(r => Array(r.size).fill(false));
    const doneAt = Array(n).fill(null);
    const readyAt = Array(n).fill(null);
    const requestedAt = Array(n).fill(null);
    const lossLeft = new Set(losses.map(l => `${l.stream}:${l.chunk}`));
    let flight = [];
    let retx = [];
    let tcpSeq = 0;
    const tcpKey = [];               // TCP sequence -> [stream, chunk]
    const tcpGot = [];
    let tcpNext = 0;
    let pid = 0, rr = 0, current = 0;
    /* Within one gap, once a chunk behind it has been held, the next one is
       obviously held too; likewise for one that got through. So per gap the
       predict prompt is offered once for each kind: `ask` marks those. */
    let gapKey = '', kindsAsked = new Set();
    const tcp = version !== 'h3';

    const request = (k, t) => { requestedAt[k] = t; readyAt[k] = t + DELAY + resources[k].think; };
    if (version === 'h1') request(0, 0);
    else for (let k = 0; k < n; k++) request(k, 0);

    /* Gaps the learner can see: a loss counts once its drop is drawn (one tick
       after sending), then while it waits to be resent and while the resend
       is in flight. */
    const holesNow = (t) => {
        const hs = [];
        for (const p of flight) if (p.lost && t - p.sentAt >= 1) hs.push([p.stream, p.chunk]);
        for (const r of retx) if (t - r.sentAt >= 1) hs.push([r.stream, r.chunk]);
        for (const p of flight) if (p.retx && !p.lost) hs.push([p.stream, p.chunk]);
        return hs.filter(([s, c]) => !received[s][c]).filter((h, i, a) => a.findIndex(x => x[0] === h[0] && x[1] === h[1]) === i);
    };
    const snap = (t, events, extra = {}) => steps.push({
        t, version, resources, n,
        sent: [...sent],
        received: received.map(r => [...r]),
        delivered: delivered.map(r => [...r]),
        doneAt: [...doneAt], readyAt: [...readyAt], requestedAt: [...requestedAt],
        flight: flight.map(p => ({ ...p, frac: Math.min(1, (t - p.sentAt) / DELAY) })),
        holes: holesNow(t),
        current, events, arrivals: [], ...extra,
    });

    for (let t = 0; t < 300; t++) {
        const events = [];
        // 1. arrivals and losses
        for (const p of flight) if (p.lost && t - p.sentAt === 1) events.push(`${resources[p.stream].name} chunk ${p.chunk + 1} is lost in the network.`);
        const arriving = flight.filter(p => !p.lost && p.sentAt + DELAY === t);
        flight = flight.filter(p => p.sentAt + DELAY > t && !(p.lost && t - p.sentAt >= 2));
        for (const p of arriving) {
            received[p.stream][p.chunk] = true;
            if (tcp) { tcpGot[p.seq] = true; }
        }
        const newly = [];
        if (tcp) {
            while (tcpGot[tcpNext]) {
                const [s, c] = tcpKey[tcpNext];
                if (!delivered[s][c]) { delivered[s][c] = true; newly.push([s, c]); }
                tcpNext++;
            }
        } else {
            for (let s = 0; s < n; s++) {
                for (let c = 0; c < resources[s].size; c++) {
                    if (delivered[s][c]) continue;
                    if (!received[s][c]) break;
                    delivered[s][c] = true; newly.push([s, c]);
                }
            }
        }
        const arrivals = arriving.map(p => ({ stream: p.stream, chunk: p.chunk, seq: p.seq, retx: p.retx, delivered: newly.some(([s, c]) => s === p.stream && c === p.chunk) }));
        // the gap the learner was looking at is the one drawn on the previous step
        const shownHoles = steps.length ? steps[steps.length - 1].holes : [];
        const key = JSON.stringify(shownHoles);
        if (key !== gapKey) { gapKey = key; kindsAsked = new Set(); }
        for (const a of arrivals) {
            a.ask = shownHoles.length > 0 && !a.retx && arrivals.length === 1 && !kindsAsked.has(a.delivered);
            if (a.ask) kindsAsked.add(a.delivered);
        }
        for (const a of arrivals) {
            const name = `${resources[a.stream].name} chunk ${a.chunk + 1}`;
            if (a.delivered) {
                const released = newly.filter(([s, c]) => !(s === a.stream && c === a.chunk));
                events.push(`${name}${a.retx ? ' (the retransmission)' : ''} arrives and is handed to the browser${released.length ? `, releasing ${released.length} chunk${released.length > 1 ? 's' : ''} that had been waiting behind it` : ''}.`);
            } else if (tcp) {
                const [hs, hc] = tcpKey[tcpNext];
                events.push(`${name} arrives, but TCP is still missing ${resources[hs].name} chunk ${hc + 1}, an earlier byte of the same connection. It waits in the receive buffer${hs === a.stream ? '' : ' — even though it belongs to a different response'}.`);
            } else {
                events.push(`${name} arrives but an earlier chunk of ${resources[a.stream].name} is missing, so QUIC holds it for that stream only.`);
            }
        }
        for (let s = 0; s < n; s++) {
            if (doneAt[s] === null && delivered[s].every(Boolean)) {
                doneAt[s] = t;
                events.push(`${resources[s].name} is complete (t = ${t}).`);
                if (version === 'h1' && s === current && current + 1 < n) {
                    current++;
                    request(current, t);
                    events.push(`Only now can the browser send the request for ${resources[current].name} on this connection.`);
                }
            }
        }

        // 2. the server puts one packet on the wire
        let pick = null, isRetx = false;
        const due = retx.findIndex(r => r.dueAt <= t);
        if (due >= 0) { pick = retx[due]; retx.splice(due, 1); isRetx = true; }
        else if (version === 'h1') {
            const s = current;
            if (readyAt[s] !== null && t >= readyAt[s] && sent[s] < resources[s].size) pick = { stream: s, chunk: sent[s]++ };
        } else {
            for (let k = 0; k < n; k++) {
                const s = (rr + k) % n;
                if (readyAt[s] !== null && t >= readyAt[s] && sent[s] < resources[s].size) { pick = { stream: s, chunk: sent[s]++ }; rr = (s + 1) % n; break; }
            }
        }
        if (pick) {
            const key = `${pick.stream}:${pick.chunk}`;
            let seq = pick.seq;
            if (!isRetx) { seq = tcpSeq++; tcpKey[seq] = [pick.stream, pick.chunk]; }
            const lost = !isRetx && lossLeft.has(key);
            if (lost) { lossLeft.delete(key); retx.push({ stream: pick.stream, chunk: pick.chunk, seq, sentAt: t, dueAt: t + RETX_AFTER }); }
            flight.push({ pid: pid++, stream: pick.stream, chunk: pick.chunk, seq, sentAt: t, lost, retx: isRetx });
            events.push(isRetx
                ? `The server resends ${resources[pick.stream].name} chunk ${pick.chunk + 1}${tcp ? ` (TCP sequence ${seq} again)` : ' in a new QUIC packet'}.`
                : `The server sends ${resources[pick.stream].name} chunk ${pick.chunk + 1}.`);
        } else if (doneAt.some(d => d === null)) {
            const waiting = resources.map((r, s) => (readyAt[s] !== null && t < readyAt[s] && sent[s] < r.size ? r.name : null)).filter(Boolean);
            if (waiting.length) events.push(`The server is still working on ${waiting.join(' and ')}; nothing else is ready to send.`);
        }

        snap(t, events, { arrivals });
        if (doneAt.every(d => d !== null)) break;
    }
    const last = steps[steps.length - 1];
    last.final = true;
    last.loadTime = Math.max(...last.doneAt);
    return steps;
}

/* When a packet is one tick from the browser while a gap is open, whether the
   browser gets it at once follows from what is drawn: under TCP any earlier
   missing packet holds it; under QUIC only a missing earlier chunk of its own
   stream does. Asked only while the answer is in doubt (the generator's `ask`):
   never about a retransmission, which always fills its own gap, and once per
   gap for a chunk that is held and once for one that is not. The two answers
   swap places with the arriving chunk's stream and number, which do not
   decide the answer. */
const predictFor = (step, next) => {
    if (!step || !next || step.final) return null;
    if (!step.holes.length || next.arrivals.length !== 1) return null;
    const a = next.arrivals[0];
    if (!a.ask) return null;
    const name = `${step.resources[a.stream].name} chunk ${a.chunk + 1}`;
    const gap = step.holes.map(([s, c]) => `${step.resources[s].name} chunk ${c + 1}`).join(', ');
    const tcp = step.version !== 'h3';
    const opts = [{ label: 'Yes — delivered at once', yes: true }, { label: 'No — held in the receive buffer', yes: false }];
    if ((a.stream + a.chunk) % 2) opts.reverse();
    return {
        question: `${gap} ${step.holes.length > 1 ? 'are' : 'is'} still missing. ${name}${a.retx ? ' (a retransmission)' : ''} reaches the browser next tick — is it handed to the page straight away?`,
        options: opts.map(o => o.label),
        correct: opts.findIndex(o => o.yes === a.delivered),
        because: a.delivered
            ? (a.retx ? 'It fills the gap itself, so it — and anything queued behind it — is delivered.'
                : tcp ? 'It was sent before the lost packet — it is ahead of it on the wire — so TCP already has every byte up to it.'
                    : `QUIC orders each stream separately, and nothing earlier in ${step.resources[a.stream].name} is missing.`)
            : tcp
                ? 'TCP delivers one ordered byte stream. Anything after a missing byte waits, whichever HTTP response it belongs to.'
                : `An earlier chunk of ${step.resources[a.stream].name} is missing, and QUIC still orders bytes within a stream.`,
    };
};

const quizQuestions = [
    {
        question: 'On a single HTTP/1.1 connection, the first response is slow to generate. What happens to the other resources?',
        options: [
            'They are sent while the server works on the first',
            'They wait: one connection carries one request–response at a time, so everything queues behind the slow response',
            'The browser cancels the slow request',
            'TCP reorders the responses',
        ],
        correct: 1,
        explanation: 'That is head-of-line blocking at the application layer. Pipelining was meant to help but still required responses in order, and browsers turned it off; instead they opened up to six parallel connections per host.',
    },
    {
        question: 'An HTTP/2 connection carries four streams. One TCP segment belonging to stream 2 is lost. What happens to streams 1, 3 and 4?',
        options: [
            'Nothing — HTTP/2 streams are independent',
            'They stall too: TCP hands bytes to HTTP/2 strictly in order, so data after the gap waits until the retransmission arrives',
            'Only stream 3 is affected, because it is next',
            'The connection is closed and reopened',
        ],
        correct: 1,
        explanation: 'HTTP/2 multiplexes streams, but they all ride one TCP byte stream. TCP does not know about streams; it will not deliver anything after a missing byte. One loss therefore stalls every stream — head-of-line blocking moved down into the transport.',
    },
    {
        question: 'How does HTTP/3 avoid that?',
        options: [
            'It uses a bigger TCP window',
            'It runs over QUIC on UDP, which tracks ordering per stream, so a loss only delays the stream it belonged to',
            'It retransmits every packet twice',
            'It opens one TCP connection per stream',
        ],
        correct: 1,
        explanation: 'QUIC builds reliability and ordering itself on top of UDP, per stream. A lost packet carrying stream 2 delays only stream 2; the others keep being delivered. QUIC also folds the TLS handshake into its own, saving a round trip on connection setup.',
    },
];

function QuizPanel({ quizState, setQuizState }) {
    const q = quizQuestions[quizState.current];
    if (quizState.complete) {
        return (
            <div className="text-center py-2">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{quizQuestions.length}</div>
                <div className="text-pink-300/80 text-sm mb-4">{quizState.score === quizQuestions.length ? 'Perfect — you know where the blocking lives.' : 'Run the lost-packet scenario under each version and retry.'}</div>
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
const SRV_X = 112, CLI_X = 548, CHUNK = 22, GAP = 4, WIRE_A = 262, WIRE_B = 524, WIRE_Y = 44, ROW0 = 96, ROW_H = 40;

function HttpStage({ step, speed }) {
    const H = ROW0 + step.n * ROW_H + 8;
    const dur = Math.min(650, speed * 0.85);
    const held = (s, c) => step.received[s][c] && !step.delivered[s][c];
    return (
        <svg viewBox={`0 0 760 ${H}`} width="100%" className="select-none">
            <style>{`.h-mv { transition: transform ${dur}ms linear, opacity .3s ease; } .h-c { transition: fill .3s ease, stroke .3s ease; }`}</style>
            <text x={20} y={20} fontSize="11" fontWeight="700" fill="#e2e8f0">server</text>
            <text x={(WIRE_A + WIRE_B) / 2} y={20} textAnchor="middle" fontSize="10" fill="#94a3b8" fontFamily="monospace">
                {step.version === 'h3' ? 'one QUIC connection (UDP)' : 'one TCP connection'}
            </text>
            <text x={CLI_X} y={20} fontSize="11" fontWeight="700" fill="#e2e8f0">browser</text>
            <line x1={WIRE_A} y1={WIRE_Y} x2={WIRE_B} y2={WIRE_Y} stroke="#334155" strokeWidth="2" />
            <line x1={WIRE_A} y1={WIRE_Y - 16} x2={WIRE_A} y2={WIRE_Y + 16} stroke="#475569" strokeWidth="1.5" />
            <line x1={WIRE_B} y1={WIRE_Y - 16} x2={WIRE_B} y2={WIRE_Y + 16} stroke="#475569" strokeWidth="1.5" />

            {step.flight.map(p => {
                const dropped = p.lost && step.t - p.sentAt >= 1;
                const x = WIRE_A + (dropped ? 0.45 : p.frac) * (WIRE_B - WIRE_A - 30) + 15;
                return (
                    <g key={p.pid} className="h-mv" style={{ transform: `translate(${x}px, ${WIRE_Y}px)` }}>
                        <rect x={-15} y={-11} width={30} height={22} rx="4" fill="#0f172a" stroke={COLORS[p.stream]} strokeWidth={p.retx ? 2.6 : 1.6} />
                        <text y={4} textAnchor="middle" fontSize="9" fontWeight="700" fill={COLORS[p.stream]} fontFamily="monospace">
                            {step.resources[p.stream].name[0].toUpperCase()}{p.chunk + 1}
                        </text>
                        {dropped && (
                            <g>
                                <line x1={-12} y1={-10} x2={12} y2={10} stroke="#f87171" strokeWidth="2.6" />
                                <line x1={-12} y1={10} x2={12} y2={-10} stroke="#f87171" strokeWidth="2.6" />
                            </g>
                        )}
                    </g>
                );
            })}

            {step.resources.map((r, s) => {
                const y = ROW0 + s * ROW_H;
                const thinking = step.readyAt[s] !== null && step.t < step.readyAt[s] && step.sent[s] < r.size;
                const notAsked = step.requestedAt[s] === null || step.requestedAt[s] > step.t;
                const isCur = step.version === 'h1' && step.current === s && step.doneAt[s] === null;
                return (
                    <g key={r.name}>
                        {isCur && <rect x={10} y={y - 16} width={740} height={ROW_H - 6} rx="6" fill="#ec4899" opacity="0.07" />}
                        <circle cx={22} cy={y - 4} r="5" fill={COLORS[s]} />
                        <text x={32} y={y} fontSize="10.5" fill="#e2e8f0" fontFamily="monospace">{r.name}</text>
                        <text x={32} y={y + 12} fontSize="8.5" fill={thinking ? '#fbbf24' : '#64748b'} fontFamily="monospace">
                            {notAsked ? 'not requested yet' : thinking ? `thinking until t=${step.readyAt[s]}` : step.sent[s] >= r.size ? 'all sent' : `request arrived`}
                        </text>
                        {Array.from({ length: r.size }).map((_, c) => {
                            const isSent = c < step.sent[s];
                            return (
                                <rect key={`s${c}`} x={SRV_X + 30 + c * (CHUNK + GAP)} y={y - 12} width={CHUNK} height={18} rx="3" className="h-c"
                                    fill={isSent ? '#1e293b' : COLORS[s]} stroke={COLORS[s]} strokeWidth="1.2" opacity={notAsked ? 0.3 : isSent ? 0.5 : 0.9} />
                            );
                        })}
                        {Array.from({ length: r.size }).map((_, c) => {
                            const del = step.delivered[s][c], hold = held(s, c);
                            const hole = step.holes.some(([hs, hc]) => hs === s && hc === c);
                            return (
                                <g key={`c${c}`}>
                                    <rect x={CLI_X + c * (CHUNK + GAP)} y={y - 12} width={CHUNK} height={18} rx="3" className="h-c"
                                        fill={del ? COLORS[s] : hold ? '#1e1b2e' : '#0f172a'}
                                        stroke={hole ? '#f87171' : del || hold ? COLORS[s] : '#334155'} strokeWidth={hole ? 1.8 : 1.2}
                                        strokeDasharray={hold ? '3 2' : hole ? '2 2' : undefined} />
                                    {hold && <text x={CLI_X + c * (CHUNK + GAP) + CHUNK / 2} y={y + 1} textAnchor="middle" fontSize="8" fontWeight="700" fill={COLORS[s]} fontFamily="monospace">wait</text>}
                                    {hole && !hold && <text x={CLI_X + c * (CHUNK + GAP) + CHUNK / 2} y={y + 1} textAnchor="middle" fontSize="9" fontWeight="700" fill="#f87171" fontFamily="monospace">?</text>}
                                </g>
                            );
                        })}
                        <text x={742} y={y + 1} textAnchor="end" fontSize="9.5" fontFamily="monospace" fill={step.doneAt[s] !== null ? '#4ade80' : '#475569'}>
                            {step.doneAt[s] !== null ? `t=${step.doneAt[s]}` : '…'}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
}

function randomScenario(rand = Math.random) {
    const names = ['report.json', 'style.css', 'app.js', 'logo.png', 'font.woff2'];
    const n = 3 + Math.floor(rand() * 2);
    const slow = rand() < 0.6 ? Math.floor(rand() * 2) : -1;
    const resources = names.slice(0, n).map((name, i) => ({ name, size: 2 + Math.floor(rand() * 3), think: i === slow ? 4 + Math.floor(rand() * 5) : 0 }));
    const losses = [];
    for (let k = 0; k < 1 + Math.floor(rand() * 2); k++) {
        const s = Math.floor(rand() * n);
        const c = Math.floor(rand() * resources[s].size);
        if (!losses.some(l => l.stream === s && l.chunk === c)) losses.push({ stream: s, chunk: c });
    }
    return { id: 'random', label: 'Random', resources, losses };
}

const codeExample = `import asyncio
import httpx                     # pip install "httpx[http2]"

URLS = [f'https://example.com/{name}'
        for name in ('report.json', 'style.css', 'app.js', 'logo.png')]

async def load(http2):
    async with httpx.AsyncClient(http2=http2) as client:
        responses = await asyncio.gather(*(client.get(u) for u in URLS))
    for r in responses:
        print(r.url.path, r.http_version, len(r.content))

# HTTP/2: one TCP + TLS connection, four streams in flight at once,
# response frames interleaved on the wire.
asyncio.run(load(http2=True))

# HTTP/1.1: the same code makes httpx open a pool of connections,
# because each one can carry only one request-response at a time.
asyncio.run(load(http2=False))

# HTTP/3 needs a QUIC stack such as aioquic; browsers discover it from the
# server's Alt-Svc header (or a DNS HTTPS record) and switch to UDP.`;

export default function HttpVersionsPage() {
    const [version, setVersion] = useState('h2');
    const [scenario, setScenario] = useState(PRESETS[1]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(800);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const stepHistory = useMemo(() => generateSteps({ version, resources: scenario.resources, losses: scenario.losses }), [version, scenario]);
    const comparison = useMemo(() => VERSIONS.map(v => {
        const st = generateSteps({ version: v.id, resources: scenario.resources, losses: scenario.losses });
        return { ...v, doneAt: st[st.length - 1].doneAt, load: st[st.length - 1].loadTime };
    }), [scenario]);

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
    const maxLoad = Math.max(...comparison.map(c => c.load));

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-pink-500 to-rose-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/computer-networks" className="flex items-center text-white hover:text-pink-100 transition-colors mb-6 w-fit">
                        <ArrowLeft className="h-5 w-5 mr-2" />Back to Computer Networks
                    </Link>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">HTTP/1.1 vs HTTP/2 vs HTTP/3</h1>
                        <p className="text-lg text-pink-100 mb-6 max-w-3xl mx-auto">
                            The same page, three protocols. Watch head-of-line blocking move from the application, into TCP, and
                            finally out of the way.
                        </p>
                        <div className="flex flex-wrap justify-center gap-3 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">1.1: one response at a time</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">2: streams over TCP</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">3: streams over QUIC</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <div className="flex flex-wrap gap-2 mb-3">
                                {VERSIONS.map(v => (
                                    <button key={v.id} onClick={() => { setVersion(v.id); restart(); }}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${version === v.id
                                            ? 'bg-pink-500/20 border-pink-500/60 text-pink-200' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'}`}>
                                        {v.label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mb-4">
                                <span className="text-xs text-slate-500 mr-1">Scenario</span>
                                {PRESETS.map(p => (
                                    <button key={p.id} onClick={() => { setScenario(p); restart(); }}
                                        className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${scenario.id === p.id ? 'bg-pink-500/20 border-pink-500/60 text-pink-200' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-pink-500/60'}`}>{p.label}</button>
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
                                <button onClick={() => { setScenario(randomScenario()); restart(); }}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors font-medium">
                                    <Shuffle size={18} />Random page
                                </button>
                                <PredictToggle predict={predict} accent="pink" />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2 text-slate-300">Animation Speed: {speed}ms per tick</label>
                                <input type="range" min="200" max="2000" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-full max-w-md accent-pink-500" />
                            </div>
                            <div className="flex justify-between items-center mb-2 text-sm">
                                <span className="text-slate-300">Tick {step.t} · step {currentStep + 1} of {stepHistory.length}</span>
                                <span className="text-slate-500 font-mono text-xs">{step.final ? `page loaded at t=${step.loadTime}` : `${step.doneAt.filter(d => d !== null).length}/${step.n} resources done`}</span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-1.5 mb-4">
                                <div className="bg-pink-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${((currentStep + 1) / stepHistory.length) * 100}%` }} />
                            </div>

                            <div className="bg-slate-950/60 rounded-lg border border-slate-800 p-2">
                                <HttpStage step={step} speed={speed} />
                            </div>
                            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
                                <span className="flex items-center gap-1.5"><span className="w-3.5 h-3 rounded-sm bg-pink-400" />delivered to the page</span>
                                <span className="flex items-center gap-1.5"><span className="w-3.5 h-3 rounded-sm border border-dashed border-pink-400" />arrived, waiting in a buffer</span>
                                <span className="flex items-center gap-1.5"><span className="w-3.5 h-3 rounded-sm border border-dashed border-red-400" />lost, not yet resent</span>
                                <span className="flex items-center gap-1.5"><span className="w-3.5 h-3 rounded-sm border-2 border-pink-400" />retransmission</span>
                            </div>
                        </div>

                        {predict.prompt && <PredictPrompt predict={predict} accent="pink" />}

                        <div className="bg-pink-500/10 border border-pink-500/20 rounded-lg p-4">
                            <div className="flex items-start gap-2">
                                <Info className="h-4 w-4 text-pink-400 mt-0.5 flex-shrink-0" />
                                <div className="text-pink-200 text-sm leading-relaxed space-y-1">
                                    {predict.hideExplanation ? <p>Make your prediction above to reveal this step.</p>
                                        : step.events.length
                                            ? step.events.map((e, i) => <p key={i}>{i === 0 && <span className="font-mono text-pink-400 mr-1.5">t={step.t}</span>}{e}</p>)
                                            : <p><span className="font-mono text-pink-400 mr-1.5">t={step.t}</span>{step.t === 0 ? (version === 'h1' ? 'The browser sends its first request. Under HTTP/1.1 the others must wait for this response to finish.' : 'The browser sends every request at once; each becomes its own stream.') : 'Packets are in flight; nothing arrives this tick.'}</p>}
                                    {step.final && !predict.hideExplanation && (
                                        <p className="pt-1">Page loaded at t = {step.loadTime}. Switch protocol to replay the same page — the comparison on the right shows all three.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <BarChart3 className="h-5 w-5 text-pink-400" />
                                <h3 className="font-bold text-white">Same Page, Three Protocols</h3>
                            </div>
                            <div className="space-y-3">
                                {comparison.map(c => (
                                    <div key={c.id} className={`rounded-lg px-2 py-1.5 ${c.id === version ? 'bg-pink-500/10' : ''}`}>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className={c.id === version ? 'text-pink-200 font-semibold' : 'text-slate-400'}>{c.label}</span>
                                            <span className="font-mono text-slate-300">loaded at t={c.load}</span>
                                        </div>
                                        <div className="space-y-0.5">
                                            {scenario.resources.map((r, s) => (
                                                <div key={r.name} className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                    <div className="h-full rounded-full" style={{ width: `${(c.doneAt[s] / maxLoad) * 100}%`, background: COLORS[s] }} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
                                Each bar is one resource&apos;s finish time. Real browsers soften HTTP/1.1 with up to six connections per
                                host; QUIC also saves a round trip at setup by merging the transport and TLS handshakes.
                            </p>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <div className="flex items-center gap-2 mb-3">
                                <Zap className="h-5 w-5 text-pink-400" />
                                <h3 className="font-bold text-white">Where the Blocking Lives</h3>
                            </div>
                            <div className="space-y-2 text-xs">
                                {[
                                    ['h1', 'HTTP/1.1', 'application: responses queue on a connection'],
                                    ['h2', 'HTTP/2', 'transport: TCP delivers bytes in order'],
                                    ['h3', 'HTTP/3', 'per stream only: QUIC orders each stream'],
                                ].map(([id, k, v]) => (
                                    <div key={id} className={`flex justify-between gap-3 px-2 py-1.5 rounded-lg ${id === version ? 'bg-pink-500/15 text-pink-200' : 'text-slate-500'}`}>
                                        <span className="font-semibold">{k}</span><span className="text-right">{v}</span>
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
                                <Code2 className="h-5 w-5" />{showCode ? 'Hide' : 'Show'} Python: HTTP/2 multiplexing with httpx
                            </button>
                            {showCode && <div className="mt-4"><CodeBlock code={codeExample} language="python" /></div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
