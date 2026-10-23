"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, RotateCcw, SkipForward, SkipBack, Shuffle, Info, Code2, Handshake,
} from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── The connection ──────────────────────────────────────────────────────────
   Every number on screen is derived from two initial sequence numbers and the
   two payload lengths, so Shuffle produces a different but consistent trace. */
const SCENARIOS = [
    { id: 'clean', label: 'Clean close',     loseFinalAck: false },
    { id: 'lost',  label: 'Final ACK lost',  loseFinalAck: true  },
];
const DEFAULT_CFG = { clientIsn: 4200, serverIsn: 9100, reqLen: 120, respLen: 360, loseFinalAck: false };

const PHASES = [
    { id: 'open',     label: 'Handshake' },
    { id: 'data',     label: 'Data' },
    { id: 'close',    label: 'Teardown' },
    { id: 'timewait', label: 'TIME_WAIT' },
];

const CLIENT_PATH = ['CLOSED', 'SYN_SENT', 'ESTABLISHED', 'FIN_WAIT_1', 'FIN_WAIT_2', 'TIME_WAIT', 'CLOSED'];
const SERVER_PATH = ['CLOSED', 'LISTEN', 'SYN_RECEIVED', 'ESTABLISHED', 'CLOSE_WAIT', 'LAST_ACK', 'CLOSED'];

/** SYN and FIN each occupy one sequence number even though they carry no data. */
const seqSpace = (seg) => seg.len + (seg.flags.includes('SYN') ? 1 : 0) + (seg.flags.includes('FIN') ? 1 : 0);
const other = (side) => (side === 'client' ? 'server' : 'client');

function generateSteps(cfg) {
    const { clientIsn: x, serverIsn: y, reqLen, respLen, loseFinalAck } = cfg;
    const steps = [];
    const segs = [];
    const ep = {
        client: { state: 'CLOSED', sndNxt: null, rcvNxt: null },
        server: { state: 'CLOSED', sndNxt: null, rcvNxt: null },
    };
    const snap = (extra) => steps.push({
        segs: segs.map(s => ({ ...s })),
        client: { ...ep.client },
        server: { ...ep.server },
        pending: null,
        ...extra,
    });

    const send = (from, seg, phase, newState, explanation, lost = false) => {
        const s = { id: segs.length, row: segs.length, from, to: other(from), flags: seg.flags, seq: seg.seq, ack: seg.ack ?? null, len: seg.len ?? 0, status: 'flying', lost, fromState: newState, toState: null };
        segs.push(s);
        ep[from].state = newState;
        ep[from].sndNxt = Math.max(ep[from].sndNxt ?? 0, s.seq + seqSpace(s));
        snap({ kind: 'send', actor: from, phase, segId: s.id, explanation });
        return s;
    };
    /* `replies` marks an arrival the receiver answers on the very next step;
       the page hides the receiver's RCV.NXT there, because that number is
       exactly the acknowledgement the learner is asked to predict. */
    const arrive = (s, phase, newState, explanation, replies = false) => {
        const live = segs[s.id];
        if (live.lost) {
            live.status = 'lost';
            snap({ kind: 'lost', actor: live.to, phase, segId: s.id, explanation });
            return;
        }
        live.status = 'arrived';
        const to = live.to;
        ep[to].rcvNxt = Math.max(ep[to].rcvNxt ?? 0, live.seq + seqSpace(live));
        if (newState) ep[to].state = newState;
        live.toState = ep[to].state;
        snap({ kind: 'recv', actor: to, phase, segId: s.id, pending: replies ? to : null, explanation });
    };

    // ── open ──
    snap({ kind: 'info', phase: 'open', explanation: `Two machines, no connection yet. Both endpoints start in CLOSED. The client will use initial sequence number (ISN) ${x} and the server ${y} — real stacks pick these pseudo-randomly so a stale segment from an old connection, or an attacker, cannot guess where the byte stream starts.` });
    ep.server.state = 'LISTEN';
    snap({ kind: 'info', actor: 'server', phase: 'open', explanation: 'The server calls listen(): a passive open. It moves to LISTEN and waits. Nothing has been sent — LISTEN just means "accept SYNs on this port".' });

    const syn = send('client', { flags: ['SYN'], seq: x }, 'open', 'SYN_SENT',
        `The client calls connect(): an active open. It sends a SYN carrying its ISN, seq=${x}, and moves to SYN_SENT. A SYN has no data, but it still occupies one sequence number — so the first real byte the client sends will be numbered ${x + 1}.`);
    arrive(syn, 'open', null,
        'The SYN reaches the server, still in LISTEN. The server now has to do two things in one segment: acknowledge the client\'s SYN, and send a SYN of its own so the client learns the server\'s ISN.', true);

    const synAck = send('server', { flags: ['SYN', 'ACK'], seq: y, ack: x + 1 }, 'open', 'SYN_RECEIVED',
        `The server answers with SYN-ACK: seq=${y} (its own ISN) and ack=${x + 1}. An acknowledgement number always names the next sequence number the sender expects, and the SYN consumed ${x}. It moves to SYN_RECEIVED.`);
    arrive(synAck, 'open', null,
        'The SYN-ACK reaches the client. Its own SYN has now been acknowledged, and it has learned the server\'s ISN — which it in turn must acknowledge.', true);

    const ack3 = send('client', { flags: ['ACK'], seq: x + 1, ack: y + 1 }, 'open', 'ESTABLISHED',
        `The client sends the third segment: ACK with ack=${y + 1}, because the server's SYN consumed ${y}. Its seq is ${x + 1}, but this pure ACK carries no data and so consumes nothing. As far as the client is concerned the connection is now ESTABLISHED.`);
    arrive(ack3, 'open', 'ESTABLISHED',
        'The ACK reaches the server, which moves to ESTABLISHED and hands the connection to accept(). Three segments, and each side has proved two things: it can reach the other, and it knows the other\'s starting sequence number. The client could send data now, half a round trip before the server even finishes this step.');

    // ── data ──
    const req = send('client', { flags: ['PSH', 'ACK'], seq: x + 1, ack: y + 1, len: reqLen }, 'data', 'ESTABLISHED',
        `The client writes a ${reqLen}-byte request. The segment's seq=${x + 1} names its first byte, so it covers bytes ${x + 1} to ${x + reqLen}. ack=${y + 1} repeats what the client still expects from the server, because nothing new has arrived.`);
    arrive(req, 'data', null,
        `${reqLen} bytes arrive at the server, starting at sequence number ${x + 1}. They are in order, so they go straight into the socket buffer for the application to read.`, true);

    const resp = send('server', { flags: ['PSH', 'ACK'], seq: y + 1, ack: x + 1 + reqLen, len: respLen }, 'data', 'ESTABLISHED',
        `The server replies with ${respLen} bytes, seq=${y + 1}, and piggybacks its acknowledgement on the same segment: ack=${x + 1 + reqLen}, the byte after the last one received (${x + 1} + ${reqLen}). Data bytes advance the sequence space one-for-one — no +1 here.`);
    arrive(resp, 'data', null,
        `The response reaches the client: bytes ${y + 1} to ${y + respLen}. Now the client is done and will close its side.`, true);

    // ── close ──
    const fin1 = send('client', { flags: ['FIN', 'ACK'], seq: x + 1 + reqLen, ack: y + 1 + respLen }, 'close', 'FIN_WAIT_1',
        `The client calls close(). It sends FIN with seq=${x + 1 + reqLen} — the next unused number — and acknowledges the response with ack=${y + 1 + respLen}. It moves to FIN_WAIT_1: "I have nothing more to send, but I can still receive." Like SYN, a FIN occupies one sequence number.`);
    arrive(fin1, 'close', null,
        'The FIN reaches the server. TCP is full-duplex, so this only closes the client-to-server direction. The kernel acknowledges it immediately, before the application has even noticed.', true);

    const finAck = send('server', { flags: ['ACK'], seq: y + 1 + respLen, ack: x + 2 + reqLen }, 'close', 'CLOSE_WAIT',
        `The server acknowledges the FIN: ack=${x + 2 + reqLen}, one past the FIN's sequence number. It moves to CLOSE_WAIT — it is waiting for its own application to call close(). A server that leaks sockets in CLOSE_WAIT is one that forgot to.`);
    arrive(finAck, 'close', 'FIN_WAIT_2',
        'The ACK reaches the client, which moves to FIN_WAIT_2. Its direction is closed and acknowledged; it is now only waiting for the server to close the other one.');

    const fin2 = send('server', { flags: ['FIN', 'ACK'], seq: y + 1 + respLen, ack: x + 2 + reqLen }, 'close', 'LAST_ACK',
        `The server application calls close(). The server sends its own FIN, seq=${y + 1 + respLen}, and moves to LAST_ACK: it needs one final acknowledgement before it can forget the connection.`);
    arrive(fin2, 'close', null,
        'The server\'s FIN reaches the client in FIN_WAIT_2. Both directions are now closed from the senders\' side; one acknowledgement remains.', true);

    const lastAck = send('client', { flags: ['ACK'], seq: x + 2 + reqLen, ack: y + 2 + respLen }, 'timewait', 'TIME_WAIT',
        `The client acknowledges the server's FIN with ack=${y + 2 + respLen} and enters TIME_WAIT. It does not close straight away — it will sit here for 2 × MSL (twice the maximum segment lifetime; 60 seconds on Linux) before releasing the connection.`,
        loseFinalAck);

    if (loseFinalAck) {
        arrive(lastAck, 'timewait', null,
            'The final ACK is lost in the network. The client cannot know: an ACK is never itself acknowledged. The server sits in LAST_ACK with its FIN still unacknowledged, and its retransmission timer running.');
        const finRetx = send('server', { flags: ['FIN', 'ACK'], seq: y + 1 + respLen, ack: x + 2 + reqLen }, 'timewait', 'LAST_ACK',
            `The server's retransmission timer fires, so it sends the FIN again — the same segment, seq=${y + 1 + respLen}. This is the case TIME_WAIT exists for.`);
        arrive(finRetx, 'timewait', 'TIME_WAIT',
            'The retransmitted FIN reaches the client, which is still in TIME_WAIT and so still remembers this connection. Had it gone straight to CLOSED, it would answer with a RST and the server would log a reset instead of a clean close.', true);
        const reAck = send('client', { flags: ['ACK'], seq: x + 2 + reqLen, ack: y + 2 + respLen }, 'timewait', 'TIME_WAIT',
            `The client re-sends the final ACK, ack=${y + 2 + respLen}, and restarts its 2 × MSL timer.`);
        arrive(reAck, 'timewait', 'CLOSED',
            'This time the ACK arrives. The server moves from LAST_ACK straight to CLOSED and frees the connection.');
    } else {
        arrive(lastAck, 'timewait', 'CLOSED',
            'The ACK reaches the server, which moves from LAST_ACK to CLOSED and frees the connection immediately. The side that closed second never waits.');
    }

    ep.client.state = 'CLOSED';
    snap({ kind: 'info', actor: 'client', phase: 'timewait', explanation: 'After 2 × MSL with nothing more from the server, the client moves to CLOSED. The wait covered two risks: a lost final ACK (the server would retransmit its FIN, as in the "Final ACK lost" scenario), and stray duplicates of this connection still in the network, which must die out before a new connection on the same four-tuple could mistake them for its own data.' });
    return steps;
}

/* After a segment arrives, the very next step is often the receiver's reply,
   and its acknowledgement number is fixed by what is on screen: the arrived
   segment's seq, its length, and whether it carried SYN or FIN. */
const predictFor = (step, next) => {
    if (!step || !next || step.kind !== 'recv' || next.kind !== 'send') return null;
    const seg = step.segs[step.segId];
    const reply = next.segs[next.segId];
    if (!seg || !reply || reply.from !== seg.to || reply.ack == null) return null;

    const consumed = seqSpace(seg);
    const correctVal = seg.seq + consumed;
    const own = step[seg.to].sndNxt;
    const pool = [correctVal, seg.seq, seg.seq + seg.len + 1, seg.seq + 1, own];
    const vals = [];
    for (const v of pool) if (v != null && !vals.includes(v) && vals.length < 4) vals.push(v);
    vals.sort((a, b) => a - b);
    // Rotated by the segment's own seq — which is random under Shuffle — so the
    // correct number is not always the smallest or the second-smallest.
    const r = seg.seq % vals.length;
    const ordered = [...vals.slice(r), ...vals.slice(0, r)];
    const flagWord = seg.flags.includes('SYN') ? 'SYN' : seg.flags.includes('FIN') ? 'FIN' : null;
    const who = seg.to === 'server' ? 'The server' : 'The client';
    return {
        question: `${who} received ${seg.flags.join('+')} seq=${seg.seq}${seg.len ? ` len=${seg.len}` : ''}. What acknowledgement number will its reply carry?`,
        options: ordered.map(v => `ack = ${v}`),
        correct: ordered.indexOf(reply.ack),
        because: flagWord
            ? `A ${flagWord} carries no data but occupies one sequence number, so the next number expected is ${seg.seq} + 1 = ${correctVal}.`
            : `The segment covered bytes ${seg.seq} to ${seg.seq + seg.len - 1}, so the next byte expected is ${seg.seq} + ${seg.len} = ${correctVal}. Data adds its length, with no extra +1.`,
    };
};

const quizQuestions = [
    {
        question: 'A client sends SYN with seq=4200. What acknowledgement number does the server put in its SYN-ACK?',
        options: ['4200', '4201', '4220', 'None — a SYN-ACK only carries the server\'s own sequence number'],
        correct: 1,
        explanation: 'The SYN carries no data but occupies one sequence number, so the next number the server expects from the client is 4201. The acknowledgement number always names the next sequence number expected, not the last one received.',
    },
    {
        question: 'Which endpoint ends up in TIME_WAIT?',
        options: [
            'Always the server',
            'Always the client',
            'Whichever side closed first (sent the first FIN)',
            'Whichever side received the first FIN',
        ],
        correct: 2,
        explanation: 'The active closer — the side that sends the first FIN — goes FIN_WAIT_1 → FIN_WAIT_2 → TIME_WAIT. The passive closer goes CLOSE_WAIT → LAST_ACK → CLOSED and never waits. Busy servers that close connections themselves therefore accumulate TIME_WAIT sockets.',
    },
    {
        question: 'Why does TIME_WAIT last 2 × MSL instead of closing immediately after the final ACK?',
        options: [
            'To give the application time to read the last bytes',
            'So a lost final ACK can be re-sent when the peer retransmits its FIN, and so stray old segments expire before the same four-tuple is reused',
            'Because the FIN must be acknowledged twice',
            'To keep the congestion window warm for the next connection',
        ],
        correct: 1,
        explanation: 'The final ACK is never itself acknowledged, so if it is lost the peer retransmits its FIN; a side still in TIME_WAIT can answer with another ACK instead of a RST. Waiting two maximum segment lifetimes also guarantees any duplicate of this connection still in the network has died before a new connection with the same addresses and ports could receive it.',
    },
];

function QuizPanel({ quizState, setQuizState }) {
    const q = quizQuestions[quizState.current];
    if (quizState.complete) {
        return (
            <div className="text-center py-2">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{quizQuestions.length}</div>
                <div className="text-pink-300/80 text-sm mb-4">{quizState.score === quizQuestions.length ? 'Perfect — you can read a packet capture.' : 'Replay the teardown and try again.'}</div>
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

// ── Sequence diagram ──────────────────────────────────────────────────────────
const CX = 200, SX = 560, TOP = 78, ROW = 36, SLOPE = 22;
const STATE_TONE = {
    CLOSED: '#64748b', LISTEN: '#38bdf8', SYN_SENT: '#fbbf24', SYN_RECEIVED: '#fbbf24',
    ESTABLISHED: '#4ade80', FIN_WAIT_1: '#fb923c', FIN_WAIT_2: '#fb923c', CLOSE_WAIT: '#fb923c',
    LAST_ACK: '#f87171', TIME_WAIT: '#c084fc',
};

function SequenceDiagram({ step, rows }) {
    const H = TOP + rows * ROW + 40;
    const current = step.segs[step.segId];
    return (
        <svg viewBox={`0 0 760 ${H}`} width="100%" className="select-none">
            <style>{`
                .t-tok { transition: transform .6s cubic-bezier(.45,0,.15,1), opacity .3s ease; }
                .t-fly { stroke-dasharray: 6 5; animation: tdash .6s linear infinite; }
                @keyframes tdash { to { stroke-dashoffset: -22; } }
            `}</style>
            <defs>
                <marker id="tah" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="userSpaceOnUse">
                    <path d="M0,0 L6,3 L0,6 Z" fill="context-stroke" />
                </marker>
            </defs>

            {[['client', CX, '10.0.0.5 : 51820'], ['server', SX, '93.184.216.34 : 80']].map(([side, x, addr]) => {
                const st = step[side].state;
                const hot = step.actor === side;
                return (
                    <g key={side}>
                        <text x={x} y={18} textAnchor="middle" fontSize="12" fontWeight="700" fill={hot ? '#f9a8d4' : '#e2e8f0'}>{side}</text>
                        <text x={x} y={32} textAnchor="middle" fontSize="9" fill="#64748b" fontFamily="monospace">{addr}</text>
                        <rect x={x - 62} y={40} width={124} height={22} rx="11" fill="#0f172a" stroke={STATE_TONE[st]} strokeWidth="1.6"
                            style={{ transition: 'stroke .4s ease' }} />
                        <text x={x} y={55} textAnchor="middle" fontSize="10" fontWeight="700" fill={STATE_TONE[st]} fontFamily="monospace">{st}</text>
                        <line x1={x} y1={66} x2={x} y2={H - 14} stroke="#334155" strokeWidth="2" />
                    </g>
                );
            })}

            {step.segs.map(s => {
                const fromX = s.from === 'client' ? CX : SX;
                const toX = s.to === 'client' ? CX : SX;
                const y1 = TOP + s.row * ROW, y2 = y1 + SLOPE;
                const frac = s.status === 'arrived' ? 1 : 0.5;
                const ex = fromX + (toX - fromX) * frac, ey = y1 + (y2 - y1) * frac;
                const isCur = current && current.id === s.id;
                const color = s.lost && s.status === 'lost' ? '#f87171' : s.from === 'client' ? '#f472b6' : '#38bdf8';
                const label = `${s.flags.join('+')}  seq=${s.seq}${s.ack != null ? `  ack=${s.ack}` : ''}${s.len ? `  len=${s.len}` : ''}`;
                const midX = (fromX + toX) / 2, midY = (y1 + y2) / 2;
                return (
                    <g key={s.id} opacity={isCur ? 1 : 0.78}>
                        <line x1={fromX} y1={y1} x2={ex} y2={ey} stroke={color} strokeWidth={isCur ? 2.2 : 1.5}
                            markerEnd={s.status === 'arrived' ? 'url(#tah)' : undefined}
                            className={s.status === 'flying' ? 't-fly' : ''} />
                        <text x={midX} y={midY - 7} textAnchor="middle" fontSize="10" fontFamily="monospace"
                            fill={isCur ? '#f8fafc' : '#94a3b8'} fontWeight={isCur ? 700 : 400}>{label}</text>
                        {s.status === 'lost' && (
                            <g transform={`translate(${ex}, ${ey})`}>
                                <line x1={-7} y1={-7} x2={7} y2={7} stroke="#f87171" strokeWidth="2.5" />
                                <line x1={-7} y1={7} x2={7} y2={-7} stroke="#f87171" strokeWidth="2.5" />
                            </g>
                        )}
                        {s.status === 'flying' && (
                            <g className="t-tok" style={{ transform: `translate(${ex}px, ${ey}px)` }}>
                                <rect x={-14} y={-8} width={28} height={16} rx="4" fill={s.from === 'client' ? '#831843' : '#075985'} stroke={color} strokeWidth="1.4" />
                                <text y={3.5} textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#f8fafc" fontFamily="monospace">{s.flags[0]}</text>
                            </g>
                        )}
                        {/* state each side was left in by this segment, on its own margin */}
                        <text x={(s.from === 'client' ? CX - 12 : SX + 12)} y={y1 + 4} textAnchor={s.from === 'client' ? 'end' : 'start'}
                            fontSize="8.5" fontFamily="monospace" fill={STATE_TONE[s.fromState] ?? '#64748b'}>{s.fromState}</text>
                        {s.toState && (
                            <text x={(s.to === 'client' ? CX - 12 : SX + 12)} y={y2 + 4} textAnchor={s.to === 'client' ? 'end' : 'start'}
                                fontSize="8.5" fontFamily="monospace" fill={STATE_TONE[s.toState] ?? '#64748b'}>{s.toState}</text>
                        )}
                    </g>
                );
            })}
        </svg>
    );
}

function StatePath({ path, state, visitedIdx, tone }) {
    return (
        <div className="space-y-1">
            {path.map((st, i) => {
                const isNow = i === visitedIdx && st === state;
                const past = i < visitedIdx;
                return (
                    <div key={`${st}-${i}`} className={`px-2 py-1 rounded text-[11px] font-mono border transition-colors ${
                        isNow ? tone : past ? 'border-slate-700 text-slate-400 bg-slate-800/40' : 'border-slate-800 text-slate-600'}`}>
                        {st}
                    </div>
                );
            })}
        </div>
    );
}

/** How far along its canonical path each endpoint is (CLOSED appears twice). */
const pathIndex = (path, steps, upto, side) => {
    let idx = 0;
    for (let i = 0; i <= upto; i++) {
        const st = steps[i][side].state;
        if (path[idx] === st) continue;
        const nextIdx = path.indexOf(st, idx + 1);
        if (nextIdx > idx) idx = nextIdx;
    }
    return idx;
};

const codeExample = `import socket

# Server: socket() + bind() + listen() is the passive open -> LISTEN
srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
srv.bind(('0.0.0.0', 8080))
srv.listen()

# Client: connect() is the active open. It sends the SYN and only
# returns once the SYN-ACK has arrived and the ACK has gone out.
cli = socket.create_connection(('127.0.0.1', 8080))   # -> ESTABLISHED

conn, addr = srv.accept()      # returns a connection the kernel already finished
cli.sendall(b'GET / HTTP/1.1\\r\\n\\r\\n')   # PSH+ACK, seq advances by len
print(conn.recv(1024))

cli.close()      # sends FIN: client -> FIN_WAIT_1 -> FIN_WAIT_2
conn.close()     # server's FIN: server -> LAST_ACK -> CLOSED
# The client now sits in TIME_WAIT; \`ss -tan state time-wait\` shows it.`;

export default function TcpHandshakePage() {
    const [cfg, setCfg] = useState(DEFAULT_CFG);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1100);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const stepHistory = useMemo(() => generateSteps(cfg), [cfg]);
    const rows = stepHistory[stepHistory.length - 1].segs.length;

    useEffect(() => {
        if (!isPlaying) return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const pauseForPredict = useCallback(() => setIsPlaying(false), []);
    const predict = usePredict(stepHistory, currentStep, predictFor, pauseForPredict);

    const step = stepHistory[Math.min(currentStep, stepHistory.length - 1)];
    const restart = (next) => { setCfg(next); setCurrentStep(0); setIsPlaying(false); predict.reset(); };
    const shuffle = () => restart({
        ...cfg,
        clientIsn: 1000 + Math.floor(Math.random() * 90000),
        serverIsn: 1000 + Math.floor(Math.random() * 90000),
        reqLen: 40 + Math.floor(Math.random() * 460),
        respLen: 200 + Math.floor(Math.random() * 1261),
    });

    const clientIdx = pathIndex(CLIENT_PATH, stepHistory, currentStep, 'client');
    const serverIdx = pathIndex(SERVER_PATH, stepHistory, currentStep, 'server');
    const hide = (side) => step.pending === side;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-pink-500 to-rose-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/computer-networks" className="flex items-center text-white hover:text-pink-100 transition-colors mb-6 w-fit">
                        <ArrowLeft className="h-5 w-5 mr-2" />Back to Computer Networks
                    </Link>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">TCP Handshake</h1>
                        <p className="text-lg text-pink-100 mb-6 max-w-3xl mx-auto">
                            SYN, SYN-ACK, ACK with real sequence numbers — then the data, the FIN teardown, and the TIME_WAIT that
                            protects the next connection.
                        </p>
                        <div className="flex flex-wrap justify-center gap-3 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Open: 1.5 RTT</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Close: 4 segments</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">SYN and FIN each consume 1 seq</div>
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
                                <button onClick={shuffle} title="New ISNs and payload sizes"
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors font-medium">
                                    <Shuffle size={18} />New ISNs
                                </button>
                                <PredictToggle predict={predict} accent="pink" />
                            </div>

                            <div className="flex flex-wrap items-center gap-2 mb-4">
                                <span className="text-xs text-slate-500 mr-1">Scenario</span>
                                {SCENARIOS.map(sc => (
                                    <button key={sc.id} onClick={() => restart({ ...cfg, loseFinalAck: sc.loseFinalAck })}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${cfg.loseFinalAck === sc.loseFinalAck
                                            ? 'bg-pink-500/20 border-pink-500/60 text-pink-200' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'}`}>
                                        {sc.label}
                                    </button>
                                ))}
                                <span className="text-xs text-slate-600 font-mono ml-auto">ISN {cfg.clientIsn} / {cfg.serverIsn}</span>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2 text-slate-300">Animation Speed: {speed}ms</label>
                                <input type="range" min="200" max="2000" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-full max-w-md accent-pink-500" />
                            </div>

                            {/* Phases */}
                            <div className="flex flex-wrap gap-1.5 mb-3">
                                {PHASES.map(ph => {
                                    const first = stepHistory.findIndex(s => s.phase === ph.id);
                                    const curIdx = PHASES.findIndex(p => p.id === step.phase);
                                    const myIdx = PHASES.findIndex(p => p.id === ph.id);
                                    return (
                                        <button key={ph.id} onClick={() => { if (first >= 0) { setCurrentStep(first); setIsPlaying(false); } }}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${myIdx === curIdx
                                                ? 'bg-pink-500/20 border-pink-500/50 text-pink-200'
                                                : myIdx < curIdx ? 'bg-slate-800/60 border-slate-700 text-slate-400' : 'border-transparent text-slate-600 hover:text-slate-400'}`}>
                                            {ph.label}
                                        </button>
                                    );
                                })}
                                <span className="ml-auto text-xs text-slate-500">Step {currentStep + 1} of {stepHistory.length}</span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-1.5 mb-4">
                                <div className="bg-pink-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${((currentStep + 1) / stepHistory.length) * 100}%` }} />
                            </div>

                            <div className="bg-slate-950/60 rounded-lg border border-slate-800 p-2">
                                <SequenceDiagram step={step} rows={rows} />
                            </div>

                            {/* Endpoint variables */}
                            <div className="grid grid-cols-2 gap-3 mt-4">
                                {['client', 'server'].map(side => (
                                    <div key={side} className={`rounded-lg border p-3 font-mono text-xs ${step.actor === side ? 'border-pink-500/40 bg-pink-500/5' : 'border-slate-800 bg-slate-900/40'}`}>
                                        <div className="text-slate-400 mb-1.5 font-sans font-semibold capitalize">{side}</div>
                                        <div className="flex justify-between"><span className="text-slate-500">SND.NXT</span><span className="text-slate-200">{step[side].sndNxt ?? '—'}</span></div>
                                        <div className="flex justify-between"><span className="text-slate-500">RCV.NXT</span>
                                            <span className={hide(side) ? 'text-pink-300' : 'text-slate-200'}>{hide(side) ? '…' : (step[side].rcvNxt ?? '—')}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <p className="text-[11px] text-slate-600 mt-2">SND.NXT is the next sequence number this side will use; RCV.NXT is the next one it expects — and what it writes in every ack field.</p>
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
                                <Handshake className="h-5 w-5 text-pink-400" />
                                <h3 className="font-bold text-white">Both State Machines</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">client (active)</p>
                                    <StatePath path={CLIENT_PATH} state={step.client.state} visitedIdx={clientIdx} tone="border-pink-500/60 bg-pink-500/15 text-pink-200" />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">server (passive)</p>
                                    <StatePath path={SERVER_PATH} state={step.server.state} visitedIdx={serverIdx} tone="border-sky-500/60 bg-sky-500/15 text-sky-200" />
                                </div>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
                                The side that closes first walks the left-hand path and pays for TIME_WAIT; the side that closes
                                second walks the right-hand one.
                            </p>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">Knowledge Check</h3>
                            <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <button onClick={() => setShowCode(c => !c)} className="flex items-center gap-2 text-pink-400 hover:text-pink-300 font-medium">
                                <Code2 className="h-5 w-5" />{showCode ? 'Hide' : 'Show'} Python: which call sends which segment
                            </button>
                            {showCode && <div className="mt-4"><CodeBlock code={codeExample} language="python" /></div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
