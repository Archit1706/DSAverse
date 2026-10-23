"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, RotateCcw, SkipForward, SkipBack, Shuffle, Info, Code2, Timer, BarChart3,
} from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── Model ───────────────────────────────────────────────────────────────────
   Time moves in ticks. A packet or ACK takes DELAY ticks to cross the link,
   so one round trip is 2 × DELAY. The sender may put at most one packet on
   the wire per tick (retransmissions first), and a timer fires TIMEOUT ticks
   after it was started. Every tick is one step. */
const N_PACKETS = 10;
const WINDOW = 4;
const DELAY = 3;
const TIMEOUT = 8;

const MODES = [
    { id: 'sw',  label: 'Stop-and-Wait' },
    { id: 'gbn', label: 'Go-Back-N' },
    { id: 'sr',  label: 'Selective Repeat' },
];
const PRESETS = [
    { id: 'none',  label: 'No loss',            lostData: [],     lostAck: []  },
    { id: 'one',   label: 'One lost packet',    lostData: [2],    lostAck: []  },
    { id: 'ack',   label: 'Lost packet + ACK',  lostData: [2],    lostAck: [5] },
    { id: 'burst', label: 'Two losses',         lostData: [3, 5], lostAck: []  },
];

const range = (a, b) => Array.from({ length: Math.max(0, b - a) }, (_, i) => a + i);

function generateSteps({ mode, lostData, lostAck }) {
    const W = mode === 'sw' ? 1 : WINDOW;
    const n = N_PACKETS;
    const steps = [];

    // sender
    let base = 0, nextSeq = 0;
    const acked = Array(n).fill(false);          // SR only
    let timerStart = null;                       // SW / GBN: one timer, on the base
    const timers = Array(n).fill(null);          // SR: expiry tick per packet
    let queue = [];                              // retransmissions waiting for the wire
    const sentCount = Array(n).fill(0);
    // receiver
    let expected = 0;                            // SW / GBN
    let rcvBase = 0;                             // SR
    const buffered = Array(n).fill(false);
    const delivered = [];
    // channel
    let flight = [];
    let nextId = 0;
    const usedData = new Set(), usedAck = new Set();
    let transmissions = 0, retransmissions = 0;

    const emitAck = (a, t, events) => {
        const lost = lostAck.includes(a) && !usedAck.has(a);
        if (lost) usedAck.add(a);
        flight.push({ id: nextId++, kind: 'ack', seq: a, sentAt: t, lost });
        events.push({ who: 'recv', text: `ACK ${a} goes back.` });
    };

    const snapshot = (t, events, extra = {}) => {
        const senderCells = range(0, n).map(s => {
            if (s < base || (mode === 'sr' && acked[s])) return 'acked';
            if (s < nextSeq) return queue.includes(s) ? 'queued' : 'outstanding';
            if (s < base + W) return 'usable';
            return 'waiting';
        });
        const rb = mode === 'sr' ? rcvBase : expected;
        const receiverCells = range(0, n).map(s => {
            if (s < rb) return 'delivered';
            if (mode === 'sr' && buffered[s]) return 'buffered';
            if (s === rb) return 'expected';
            if (mode === 'sr' && s < rb + W) return 'window';
            return 'none';
        });
        let timerView = [];
        if (mode === 'sr') {
            timerView = range(base, nextSeq).filter(s => !acked[s] && timers[s] != null).map(s => ({ seq: s, left: timers[s] - t }));
        } else if (timerStart != null) {
            timerView = [{ seq: base, left: timerStart + TIMEOUT - t }];
        }
        steps.push({
            t, mode, W, base, nextSeq, rcvBase: rb,
            senderCells, receiverCells,
            flight: flight.map(f => ({ ...f, frac: Math.min(1, (t - f.sentAt) / DELAY), dropped: f.lost && t - f.sentAt >= 1 })),
            timers: timerView,
            queue: [...queue],
            events,
            delivered: [...delivered],
            transmissions, retransmissions,
            ...extra,
        });
    };

    snapshot(-1, [{ who: 'info', text: `${n} packets to send. ${mode === 'sw' ? 'Stop-and-Wait keeps one packet in flight at a time.' : `The sender may have up to ${W} unacknowledged packets in flight.`} Each one takes ${DELAY} ticks to cross the link, so a round trip is ${2 * DELAY} ticks; the retransmission timer is ${TIMEOUT}.` }]);

    let lastAckKind = null;
    let timeoutAsked = false;
    for (let t = 0; t < 400; t++) {
        const events = [];
        const ackArrivals = [];
        const baseBefore = base;
        let timeoutInfo = null;

        // 1. drop lost items that have already been shown dying, and deliver arrivals
        flight = flight.filter(f => !(f.lost && t - f.sentAt >= 2));
        for (const f of flight.filter(x => x.lost && t - x.sentAt === 1)) {
            events.push({ who: 'net', text: f.kind === 'data' ? `Packet ${f.seq} is lost in the network — neither side knows yet.` : `ACK ${f.seq} is lost on the way back.` });
        }
        const arriving = flight.filter(f => !f.lost && t - f.sentAt === DELAY);
        flight = flight.filter(f => !arriving.includes(f));

        for (const f of arriving.filter(x => x.kind === 'data')) {
            const s = f.seq;
            if (mode === 'sr') {
                if (s >= rcvBase && s < rcvBase + W) {
                    const wasGap = s === rcvBase;
                    buffered[s] = true;
                    const start = rcvBase;
                    while (rcvBase < n && buffered[rcvBase]) { delivered.push(rcvBase); rcvBase++; }
                    if (wasGap) {
                        events.push({ who: 'recv', text: rcvBase - start > 1
                            ? `Packet ${s} fills the gap: packets ${start}–${rcvBase - 1} are delivered together.`
                            : `Packet ${s} arrives in order and is delivered.` });
                    } else {
                        events.push({ who: 'recv', text: `Packet ${s} arrives while ${rcvBase} is missing, so it is buffered — not delivered yet.` });
                    }
                    emitAck(s, t, events);
                } else if (s < rcvBase && s >= rcvBase - W) {
                    events.push({ who: 'recv', text: `Packet ${s} was already delivered; its ACK must have been lost, so the receiver acknowledges it again.` });
                    emitAck(s, t, events);
                }
            } else if (s === expected) {
                delivered.push(s);
                expected++;
                events.push({ who: 'recv', text: `Packet ${s} arrives in order and is delivered.` });
                emitAck(s, t, events);
            } else {
                events.push({ who: 'recv', text: s < expected
                    ? `Packet ${s} is a duplicate of one already delivered; it is discarded.`
                    : `Packet ${s} arrives but packet ${expected} is missing. ${mode === 'gbn' ? 'Go-Back-N keeps no buffer, so it is discarded.' : ''}` });
                if (expected > 0) emitAck(expected - 1, t, events);
                else events.push({ who: 'recv', text: 'Nothing has been received in order yet, so there is no ACK to repeat.' });
            }
        }

        for (const f of arriving.filter(x => x.kind === 'ack')) {
            const a = f.seq;
            ackArrivals.push(a);
            if (mode === 'sr') {
                if (a >= base && a < nextSeq && !acked[a]) {
                    acked[a] = true;
                    timers[a] = null;
                    queue = queue.filter(q => q !== a);
                    const before = base;
                    while (base < n && acked[base]) base++;
                    events.push({ who: 'send', text: base > before
                        ? `ACK ${a} reaches the sender; the base slides to ${base}.`
                        : `ACK ${a} reaches the sender and packet ${a} is marked done — but ${base} is still unacknowledged, so the window cannot slide.` });
                } else {
                    events.push({ who: 'send', text: `ACK ${a} is for a packet already acknowledged; ignored.` });
                }
            } else if (a >= base) {
                const before = base;
                base = a + 1;
                queue = queue.filter(q => q >= base);
                timerStart = base === nextSeq ? null : t;
                events.push({ who: 'send', text: mode === 'gbn' && base - before > 1
                    ? `ACK ${a} reaches the sender. ACKs are cumulative, so it confirms everything up to ${a}: the base jumps from ${before} to ${base}.`
                    : `ACK ${a} reaches the sender; the base slides to ${base}.${timerStart != null ? ' The timer restarts for the new oldest packet.' : ''}` });
            } else {
                events.push({ who: 'send', text: `ACK ${a} is a duplicate — it confirms nothing new, so the base stays at ${base}.` });
            }
        }

        // 2. timeouts
        if (base < n) {
            if (mode === 'sr') {
                const expired = range(base, nextSeq).filter(s => !acked[s] && timers[s] != null && t >= timers[s]);
                for (const s of expired) {
                    timers[s] = null;
                    if (!queue.includes(s)) queue.push(s);
                }
                if (expired.length) {
                    timeoutInfo = { expired, retx: [...expired] };
                    events.push({ who: 'send', text: `Timeout on packet ${expired.join(', ')}. Selective Repeat retransmits only ${expired.length > 1 ? 'those packets' : 'that packet'}.` });
                }
            } else if (timerStart != null && t >= timerStart + TIMEOUT) {
                queue = range(base, nextSeq);
                timerStart = t;
                timeoutInfo = { expired: [base], retx: [...queue] };
                events.push({ who: 'send', text: mode === 'gbn'
                    ? `Timeout on packet ${base}. Go-Back-N goes back to ${base} and queues every outstanding packet (${queue.length > 1 ? `${base}–${nextSeq - 1}` : base}) for retransmission.`
                    : `Timeout: packet ${base} was never acknowledged, so it is sent again.` });
            }
        }
        /* Only the first timeout in a run is a real question: once the learner
           has seen how this sender reacts, every later one repeats the rule. */
        if (timeoutInfo) {
            timeoutInfo.ask = !timeoutAsked && timeoutInfo.expired.length === 1 && nextSeq - 1 > baseBefore;
            if (timeoutInfo.ask) timeoutAsked = true;
        }

        // 3. at most one transmission per tick
        let sendSeq = null, isRetx = false;
        if (queue.length) { sendSeq = queue.shift(); isRetx = true; }
        else if (nextSeq < base + W && nextSeq < n) { sendSeq = nextSeq++; }
        if (sendSeq != null) {
            const lost = lostData.includes(sendSeq) && !usedData.has(sendSeq);
            if (lost) usedData.add(sendSeq);
            flight.push({ id: nextId++, kind: 'data', seq: sendSeq, sentAt: t, lost, retx: sentCount[sendSeq] > 0 });
            sentCount[sendSeq]++;
            transmissions++;
            if (isRetx || sentCount[sendSeq] > 1) retransmissions++;
            if (mode === 'sr') timers[sendSeq] = t + TIMEOUT;
            else if (timerStart == null) timerStart = t;
            events.push({ who: 'send', text: isRetx ? `Packet ${sendSeq} is retransmitted.` : `Packet ${sendSeq} is sent.` });
        } else if (base < n && nextSeq >= base + W && !arriving.length) {
            events.push({ who: 'send', text: `The window [${base}–${base + W - 1}] is full, so the sender waits.` });
        }

        /* 'trivial' = the single ACK for the base arrived and the base moved by
           one, the case that teaches nothing once seen. */
        const ackKind = !ackArrivals.length ? null
            : ackArrivals.length === 1 && ackArrivals[0] === baseBefore && base === baseBefore + 1 ? 'trivial' : 'nontrivial';
        const done = base >= n;
        snapshot(t, events, { ackArrivals, ackKind, lastAckKind, timeout: timeoutInfo, done });
        if (ackKind) lastAckKind = ackKind;
        if (done) break;
    }
    const last = steps[steps.length - 1];
    last.events = [...last.events, { who: 'info', text: `All ${n} packets delivered in order after ${last.t + 1} ticks, using ${last.transmissions} transmissions (${last.retransmissions} retransmission${last.retransmissions === 1 ? '' : 's'}).` }];
    return steps;
}

/* Two decisions the learner can make from the screen alone:
     - which packets go back after a timer that reads "1" expires (asked for the
       first timeout of a run only — after that the answer repeats), and
     - where the window's base lands when the ACKs one tick from the sender arrive.
   Arrivals are processed before timeouts within a tick, so when a timeout does
   fire, the base and the outstanding range on screen are still the ones it
   acts on. */
const predictFor = (step, next) => {
    if (!step || !next || step.t < 0) return null;

    if (next.timeout && step.mode !== 'sw') {
        const { expired, retx } = next.timeout;
        const last = step.nextSeq - 1;
        if (!next.timeout.ask || expired.length !== 1 || last <= step.base) return null;
        const s = expired[0];
        // The real choice: just the packet whose timer expired, or everything outstanding.
        const opts = [
            { label: `Only packet ${s}`, set: [s] },
            { label: `Packets ${step.base}–${last}`, set: range(step.base, step.nextSeq) },
        ];
        const r = step.t % opts.length;
        const ordered = [...opts.slice(r), ...opts.slice(0, r)];
        const correct = ordered.findIndex(o => JSON.stringify(o.set) === JSON.stringify(retx));
        if (correct < 0) return null;
        return {
            question: `The timer on packet ${s} expires on the next tick. What does the ${step.mode === 'gbn' ? 'Go-Back-N' : 'Selective Repeat'} sender queue for retransmission?`,
            options: ordered.map(o => o.label),
            correct,
            because: step.mode === 'gbn'
                ? `Go-Back-N's receiver threw away everything after the gap, so the sender must resend every outstanding packet from ${step.base} to ${last}.`
                : `Selective Repeat's receiver buffers out-of-order packets and ACKs each one, so only the packet whose own timer expired — ${s} — is resent.`,
        };
    }

    /* Asked for every ACK that does something other than nudge the base by one,
       plus the very first ACK and the first ordinary one after an unusual one —
       so "stays put" is not the answer to nearly every prompt. */
    const arriving = next.ackArrivals ?? [];
    if (!arriving.length) return null;
    if (next.ackKind === 'trivial' && next.lastAckKind === 'trivial') return null;

    const cands = [step.base, next.base, step.base + 1, Math.max(...arriving) + 1, step.nextSeq]
        .filter((v, i, a) => v <= N_PACKETS && a.indexOf(v) === i);
    cands.sort((a, b) => a - b);
    const vals = cands.slice(0, 4).includes(next.base) ? cands.slice(0, 4) : [...cands.slice(0, 3), next.base].sort((a, b) => a - b);
    const r = step.t % vals.length;
    const ordered = [...vals.slice(r), ...vals.slice(0, r)];
    const label = v => (v === step.base ? `Stays at ${v}` : v >= N_PACKETS ? `Slides past the end (all ${N_PACKETS} done)` : `Slides to ${v}`);
    const ackWord = arriving.length > 1 ? `ACKs ${arriving.join(', ')} reach` : `ACK ${arriving[0]} reaches`;
    return {
        question: `${ackWord} the sender on the next tick. Where does the window's base end up?`,
        options: ordered.map(label),
        correct: ordered.indexOf(next.base),
        because: step.mode === 'sr'
            ? `Selective Repeat ACKs are individual: the base only moves past packets that are themselves acknowledged, so it lands on the first unacknowledged packet, ${next.base}.`
            : `ACKs here are cumulative: ACK k confirms every packet up to k, so the base moves to one past the highest new ACK — or stays put for a duplicate. It lands on ${next.base}.`,
    };
};

/** The Random losses button: one or two lost packets, and a lost ACK half the time. */
function randomLosses(rand = Math.random) {
    const pick = () => Math.floor(rand() * N_PACKETS);
    const lostData = [...new Set(Array.from({ length: 1 + Math.floor(rand() * 2) }, pick))].sort((a, b) => a - b);
    const lostAck = rand() < 0.5 ? [pick()] : [];
    return { lostData, lostAck };
}

const quizQuestions = [
    {
        question: 'Go-Back-N with window 4 has packets 2, 3, 4 and 5 outstanding. Packet 2 is lost; 3, 4 and 5 arrive. What happens when packet 2\'s timer expires?',
        options: [
            'Only packet 2 is resent',
            'Packets 2, 3, 4 and 5 are all resent',
            'Packets 3, 4 and 5 are resent',
            'Nothing — the receiver already has 3, 4 and 5',
        ],
        correct: 1,
        explanation: 'A Go-Back-N receiver keeps no buffer: it discarded 3, 4 and 5 because 2 was missing, and kept re-sending ACK 1. So the sender goes back to 2 and resends everything outstanding. Selective Repeat would resend only packet 2.',
    },
    {
        question: 'With sequence numbers taken modulo m, how large can a Selective Repeat window be?',
        options: ['m − 1', 'm / 2', 'm', '2m'],
        correct: 1,
        explanation: 'If the window exceeded half the sequence space, a retransmitted old packet could carry the same number as a new packet the receiver is now waiting for, and be accepted as new data. Go-Back-N only needs a window of at most m − 1.',
    },
    {
        question: 'A link has a 30 ms round trip, packets take 1 ms to transmit, and the protocol is Stop-and-Wait. Roughly what fraction of the time is the link busy?',
        options: ['About 3%', 'About 50%', 'About 97%', '100%'],
        correct: 0,
        explanation: 'Stop-and-Wait sends one packet (1 ms) and then idles until the ACK returns, so utilisation is 1 / (1 + 30) ≈ 3%. Pipelining — keeping a window of W packets in flight — multiplies that by up to W, which is the whole reason sliding windows exist.',
    },
];

function QuizPanel({ quizState, setQuizState }) {
    const q = quizQuestions[quizState.current];
    if (quizState.complete) {
        return (
            <div className="text-center py-2">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{quizQuestions.length}</div>
                <div className="text-pink-300/80 text-sm mb-4">{quizState.score === quizQuestions.length ? 'Perfect — you know what to resend.' : 'Run one lost packet under each protocol and retry.'}</div>
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
const COL = 72, X0 = 22, CELL = 58, SEND_Y = 52, RECV_Y = 330, CELL_H = 36;
const CH_TOP = SEND_Y + CELL_H + 8, CH_BOT = RECV_Y - 8;
const cx = s => X0 + s * COL + CELL / 2;

const SEND_STYLE = {
    acked:       { fill: '#14532d', stroke: '#22c55e', text: '#dcfce7' },
    outstanding: { fill: '#713f12', stroke: '#facc15', text: '#fef9c3' },
    queued:      { fill: '#7f1d1d', stroke: '#f87171', text: '#fee2e2' },
    usable:      { fill: '#0f172a', stroke: '#f472b6', text: '#fbcfe8' },
    waiting:     { fill: '#0f172a', stroke: '#334155', text: '#475569' },
};
const RECV_STYLE = {
    delivered: { fill: '#14532d', stroke: '#22c55e', text: '#dcfce7' },
    buffered:  { fill: '#1e3a8a', stroke: '#60a5fa', text: '#dbeafe' },
    expected:  { fill: '#0f172a', stroke: '#f472b6', text: '#fbcfe8' },
    window:    { fill: '#0f172a', stroke: '#9d174d', text: '#f9a8d4' },
    none:      { fill: '#0f172a', stroke: '#334155', text: '#475569' },
};

function WindowStage({ step, speed }) {
    const dur = Math.min(650, speed * 0.85);
    const winW = step.W * COL - (COL - CELL) + 10;
    return (
        <svg viewBox="0 0 760 400" width="100%" className="select-none">
            <style>{`
                .w-cell { transition: fill .35s ease, stroke .35s ease; }
                .w-move { transition: transform ${dur}ms linear, opacity .3s ease; }
                .w-win  { transition: transform .5s cubic-bezier(.45,0,.15,1); }
            `}</style>
            <text x={X0} y={SEND_Y - 14} fontSize="11" fontWeight="700" fill="#e2e8f0">sender</text>
            <text x={X0 + 56} y={SEND_Y - 14} fontSize="9.5" fill="#64748b" fontFamily="monospace">
                base {Math.min(step.base, N_PACKETS)} · next {step.nextSeq} · window {step.W}
            </text>
            <text x={X0} y={RECV_Y + CELL_H + 24} fontSize="11" fontWeight="700" fill="#e2e8f0">receiver</text>
            <text x={X0 + 68} y={RECV_Y + CELL_H + 24} fontSize="9.5" fill="#64748b" fontFamily="monospace">
                {step.mode === 'sr' ? `receive window starts at ${step.rcvBase}` : `expecting ${step.rcvBase}`} · delivered {step.delivered.length}
            </text>

            {/* sender window bracket */}
            <g className="w-win" style={{ transform: `translate(${X0 - 5 + Math.min(step.base, N_PACKETS) * COL}px, ${SEND_Y - 5}px)` }}>
                <rect width={winW} height={CELL_H + 10} rx="9" fill="none" stroke="#ec4899" strokeWidth="2" strokeDasharray="5 3"
                    opacity={step.base >= N_PACKETS ? 0 : 1} />
            </g>
            {step.mode === 'sr' && (
                <g className="w-win" style={{ transform: `translate(${X0 - 5 + Math.min(step.rcvBase, N_PACKETS) * COL}px, ${RECV_Y - 5}px)` }}>
                    <rect width={winW} height={CELL_H + 10} rx="9" fill="none" stroke="#60a5fa" strokeWidth="1.6" strokeDasharray="5 3"
                        opacity={step.rcvBase >= N_PACKETS ? 0 : 0.8} />
                </g>
            )}

            {range(0, N_PACKETS).map(s => {
                const sc = SEND_STYLE[step.senderCells[s]];
                const rc = RECV_STYLE[step.receiverCells[s]];
                const tm = step.timers.find(x => x.seq === s);
                return (
                    <g key={s}>
                        <rect x={X0 + s * COL} y={SEND_Y} width={CELL} height={CELL_H} rx="6" className="w-cell" fill={sc.fill} stroke={sc.stroke} strokeWidth="1.6" />
                        <text x={cx(s)} y={SEND_Y + 23} textAnchor="middle" fontSize="13" fontWeight="700" fill={sc.text} fontFamily="monospace">{s}</text>
                        {tm && (
                            <g>
                                <rect x={cx(s) - 15} y={SEND_Y - 13} width={30} height={13} rx="6" fill={tm.left <= 1 ? '#dc2626' : '#334155'} />
                                <text x={cx(s)} y={SEND_Y - 3.5} textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#f8fafc" fontFamily="monospace">{tm.left}t</text>
                            </g>
                        )}
                        <rect x={X0 + s * COL} y={RECV_Y} width={CELL} height={CELL_H} rx="6" className="w-cell" fill={rc.fill} stroke={rc.stroke} strokeWidth="1.6" />
                        <text x={cx(s)} y={RECV_Y + 23} textAnchor="middle" fontSize="13" fontWeight="700" fill={rc.text} fontFamily="monospace">{s}</text>
                        <line x1={cx(s)} y1={CH_TOP} x2={cx(s)} y2={CH_BOT} stroke="#1e293b" strokeWidth="1" />
                    </g>
                );
            })}

            {step.flight.map(f => {
                const isData = f.kind === 'data';
                const frac = f.dropped ? 0.45 : f.frac;
                const y = isData ? CH_TOP + frac * (CH_BOT - CH_TOP - 22) : CH_BOT - 22 - frac * (CH_BOT - CH_TOP - 22);
                const x = cx(f.seq) + (isData ? -15 : 15);
                return (
                    <g key={f.id} className="w-move" style={{ transform: `translate(${x}px, ${y}px)`, opacity: f.dropped ? 0.85 : 1 }}>
                        {isData ? (
                            <rect x={-11} y={0} width={22} height={22} rx="4" fill={f.retx ? '#9f1239' : '#be185d'} stroke="#f9a8d4" strokeWidth="1.3" />
                        ) : (
                            <rect x={-12} y={2} width={24} height={18} rx="9" fill="#065f46" stroke="#6ee7b7" strokeWidth="1.3" />
                        )}
                        <text y={14.5} textAnchor="middle" fontSize="9" fontWeight="700" fill="#f8fafc" fontFamily="monospace">{isData ? f.seq : `A${f.seq}`}</text>
                        {f.dropped && (
                            <g>
                                <line x1={-10} y1={1} x2={10} y2={21} stroke="#f87171" strokeWidth="2.6" />
                                <line x1={-10} y1={21} x2={10} y2={1} stroke="#f87171" strokeWidth="2.6" />
                            </g>
                        )}
                    </g>
                );
            })}
            <text x={746} y={(CH_TOP + CH_BOT) / 2 - 6} textAnchor="end" fontSize="9" fill="#475569" fontFamily="monospace">data ↓</text>
            <text x={746} y={(CH_TOP + CH_BOT) / 2 + 8} textAnchor="end" fontSize="9" fill="#475569" fontFamily="monospace">ACK ↑</text>
        </svg>
    );
}

const codeExample = `# Go-Back-N sender: one timer, cumulative ACKs
class GoBackNSender:
    def __init__(self, packets, window):
        self.packets, self.window = packets, window
        self.base = 0        # oldest unacknowledged packet
        self.next_seq = 0    # next new packet to send

    def can_send(self):
        return self.next_seq < min(self.base + self.window, len(self.packets))

    def send_new(self, wire, timer):
        wire.send(self.next_seq, self.packets[self.next_seq])
        if self.base == self.next_seq:
            timer.start()                 # timer covers the oldest packet
        self.next_seq += 1

    def on_ack(self, ack, timer):
        if ack < self.base:
            return                        # duplicate: confirms nothing new
        self.base = ack + 1               # cumulative: everything <= ack is done
        timer.stop() if self.base == self.next_seq else timer.start()

    def on_timeout(self, wire, timer):
        timer.start()
        for seq in range(self.base, self.next_seq):   # go back N
            wire.send(seq, self.packets[seq])

# Selective Repeat differs in three places: a timer per packet, an ACK per
# packet, and a receiver that buffers out-of-order packets instead of
# discarding them — so on_timeout resends only the packet that expired.`;

export default function SlidingWindowPage() {
    const [mode, setMode] = useState('gbn');
    const [lostData, setLostData] = useState([2]);
    const [lostAck, setLostAck] = useState([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(700);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const stepHistory = useMemo(() => generateSteps({ mode, lostData, lostAck }), [mode, lostData, lostAck]);
    /* The same losses under all three protocols, for the comparison card. */
    const comparison = useMemo(() => MODES.map(m => {
        const st = generateSteps({ mode: m.id, lostData, lostAck });
        const last = st[st.length - 1];
        return { ...m, ticks: last.t + 1, tx: last.transmissions, retx: last.retransmissions };
    }), [lostData, lostAck]);

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
    const toggle = (list, setList, s) => { setList(list.includes(s) ? list.filter(x => x !== s) : [...list, s].sort((a, b) => a - b)); restart(); };
    const applyPreset = (p) => { setLostData(p.lostData); setLostAck(p.lostAck); restart(); };
    const shuffle = () => { const { lostData: d, lostAck: a } = randomLosses(); setLostData(d); setLostAck(a); restart(); };

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-pink-500 to-rose-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/computer-networks" className="flex items-center text-white hover:text-pink-100 transition-colors mb-6 w-fit">
                        <ArrowLeft className="h-5 w-5 mr-2" />Back to Computer Networks
                    </Link>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Sliding Window Protocols</h1>
                        <p className="text-lg text-pink-100 mb-6 max-w-3xl mx-auto">
                            Keep several packets in flight, recover from the ones the network eats. Drop any packet or ACK and
                            see what each protocol resends.
                        </p>
                        <div className="flex flex-wrap justify-center gap-3 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Window: {WINDOW}</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">RTT: {2 * DELAY} ticks</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Timeout: {TIMEOUT} ticks</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <div className="flex flex-wrap gap-2 mb-4">
                                {MODES.map(m => (
                                    <button key={m.id} onClick={() => { setMode(m.id); restart(); }}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${mode === m.id
                                            ? 'bg-pink-500/20 border-pink-500/60 text-pink-200' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'}`}>
                                        {m.label}
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
                                    <Shuffle size={18} />Random losses
                                </button>
                                <PredictToggle predict={predict} accent="pink" />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2 text-slate-300">Animation Speed: {speed}ms per tick</label>
                                <input type="range" min="200" max="2000" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-full max-w-md accent-pink-500" />
                            </div>

                            <div className="flex justify-between items-center mb-2 text-sm">
                                <span className="text-slate-300">Tick {Math.max(0, step.t)} · step {currentStep + 1} of {stepHistory.length}</span>
                                <span className="text-slate-500 font-mono text-xs">sent {step.transmissions} · resent {step.retransmissions}</span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-1.5 mb-4">
                                <div className="bg-pink-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${((currentStep + 1) / stepHistory.length) * 100}%` }} />
                            </div>

                            <div className="bg-slate-950/60 rounded-lg border border-slate-800 p-2">
                                <WindowStage step={step} speed={speed} />
                            </div>

                            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-3 text-xs">
                                {[['bg-green-700 border-green-500', 'acknowledged / delivered'], ['bg-yellow-800 border-yellow-400', 'sent, awaiting ACK'], ['bg-red-900 border-red-400', 'queued to resend'], ['bg-slate-900 border-pink-400', 'in window, not sent'], ['bg-blue-900 border-blue-400', 'buffered (SR)']].map(([c, l]) => (
                                    <span key={l} className="flex items-center gap-1.5 text-slate-400"><span className={`w-3 h-3 rounded border ${c}`} />{l}</span>
                                ))}
                            </div>

                        </div>

                        {predict.prompt && <PredictPrompt predict={predict} accent="pink" />}

                        <div className="bg-pink-500/10 border border-pink-500/20 rounded-lg p-4">
                            <div className="flex items-start gap-2">
                                <Info className="h-4 w-4 text-pink-400 mt-0.5 flex-shrink-0" />
                                <div className="text-pink-200 text-sm leading-relaxed space-y-1">
                                    {predict.hideExplanation
                                        ? <p>Make your prediction above to reveal this step.</p>
                                        : step.events.length
                                            ? step.events.map((e, i) => <p key={i}>{step.t >= 0 && i === 0 ? <span className="font-mono text-pink-400 mr-1.5">t={step.t}</span> : null}{e.text}</p>)
                                            : <p><span className="font-mono text-pink-400 mr-1.5">t={step.t}</span>Packets and ACKs are in flight; nothing arrives this tick.</p>}
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-3">Inject Losses</h3>
                            <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs text-slate-500 mr-1">Presets</span>
                                    {PRESETS.map(p => (
                                        <button key={p.id} onClick={() => applyPreset(p)}
                                            className="px-2.5 py-1 rounded-lg text-xs border bg-slate-800 border-slate-700 text-slate-300 hover:border-pink-500/60">{p.label}</button>
                                    ))}
                                </div>
                                {[['Drop packet', lostData, setLostData], ['Drop its ACK', lostAck, setLostAck]].map(([label, list, setList]) => (
                                    <div key={label} className="flex flex-wrap items-center gap-1.5">
                                        <span className="text-xs text-slate-500 w-24">{label}</span>
                                        {range(0, N_PACKETS).map(s => (
                                            <button key={s} onClick={() => toggle(list, setList, s)} aria-pressed={list.includes(s)}
                                                className={`w-8 h-7 rounded text-xs font-mono border transition-colors ${list.includes(s)
                                                    ? 'bg-red-500/25 border-red-500 text-red-200' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                ))}
                                <p className="text-[11px] text-slate-600">Each marked packet or ACK is lost on its first trip only; the retransmission gets through.</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <BarChart3 className="h-5 w-5 text-pink-400" />
                                <h3 className="font-bold text-white">Same Losses, Three Protocols</h3>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="grid grid-cols-[1.7fr_1fr_1fr_1fr] gap-2 text-[11px] text-slate-500"><span>protocol</span><span className="text-right">ticks</span><span className="text-right">sent</span><span className="text-right">resent</span></div>
                                {comparison.map(c => (
                                    <div key={c.id} className={`grid grid-cols-[1.7fr_1fr_1fr_1fr] gap-2 px-2 py-1.5 rounded-lg ${c.id === mode ? 'bg-pink-500/15 text-pink-200' : 'text-slate-400'}`}>
                                        <span className="text-xs">{c.label}</span>
                                        <span className="text-right font-mono text-xs">{c.ticks}</span>
                                        <span className="text-right font-mono text-xs">{c.tx}</span>
                                        <span className="text-right font-mono text-xs">{c.retx}</span>
                                    </div>
                                ))}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
                                Stop-and-Wait wastes the pipe; Go-Back-N fills it but pays for a lost packet with a whole
                                window of resends; Selective Repeat resends only what was lost, at the cost of a receive buffer
                                and a timer per packet. Try dropping only an ACK: a later cumulative ACK covers it for
                                Go-Back-N, while Selective Repeat has to resend.
                            </p>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <div className="flex items-center gap-2 mb-3">
                                <Timer className="h-5 w-5 text-pink-400" />
                                <h3 className="font-bold text-white">How They Differ</h3>
                            </div>
                            {/* blurred while a prediction is open: this card states the rule being asked about */}
                            {predict.hideExplanation && <p className="text-[11px] text-pink-300/80 mb-2">Hidden until you answer the prediction.</p>}
                            <div className={`space-y-2 text-xs transition ${predict.hideExplanation ? 'blur-sm select-none' : ''}`}>
                                {[
                                    ['Window', '1', 'N', 'N'],
                                    ['Receiver buffer', 'none', 'none', 'N packets'],
                                    ['ACKs', 'per packet', 'cumulative', 'per packet'],
                                    ['Timers', '1', '1 (oldest)', '1 per packet'],
                                    ['On timeout resend', 'that packet', 'all outstanding', 'that packet'],
                                ].map(([k, ...v]) => (
                                    <div key={k} className="grid grid-cols-[1.3fr_1fr_1fr_1fr] gap-2">
                                        <span className="text-slate-500">{k}</span>
                                        {v.map((x, i) => <span key={i} className={`font-mono text-[10px] ${MODES[i].id === mode ? 'text-pink-300' : 'text-slate-400'}`}>{x}</span>)}
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
                                <Code2 className="h-5 w-5" />{showCode ? 'Hide' : 'Show'} Python: a Go-Back-N sender
                            </button>
                            {showCode && <div className="mt-4"><CodeBlock code={codeExample} language="python" /></div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
