"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, RotateCcw, SkipForward, SkipBack, Shuffle, Info, Code2, TrendingUp, GitCompare,
} from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* ── Model ───────────────────────────────────────────────────────────────────
   One step per round trip. cwnd (in segments) is what the sender may have in
   flight during that RTT; an event, if any, happens during the round and the
   rules below decide the next round's cwnd and ssthresh.
     no loss, cwnd < ssthresh  -> slow start:  cwnd = min(2·cwnd, ssthresh)
     no loss, cwnd >= ssthresh -> avoidance:   cwnd = cwnd + 1
     timeout (both)            -> ssthresh = max(⌊cwnd/2⌋, 2), cwnd = 1
     3 dup ACKs, Tahoe         -> same as a timeout
     3 dup ACKs, Reno          -> ssthresh = max(⌊cwnd/2⌋, 2), cwnd = ssthresh */
const ROUNDS = 24;
const VARIANTS = [
    { id: 'reno',  label: 'TCP Reno' },
    { id: 'tahoe', label: 'TCP Tahoe' },
];
const PRESETS = [
    { id: 'mixed',  label: 'Dup ACKs, then a timeout', ssthresh: 16, events: [{ round: 9, type: 'dup' }, { round: 17, type: 'timeout' }] },
    { id: 'saw',    label: 'Sawtooth',                 ssthresh: 32, events: [{ round: 7, type: 'dup' }, { round: 12, type: 'dup' }, { round: 17, type: 'dup' }, { round: 22, type: 'dup' }] },
    { id: 'timers', label: 'Timeouts only',            ssthresh: 16, events: [{ round: 8, type: 'timeout' }, { round: 16, type: 'timeout' }] },
    { id: 'clean',  label: 'No loss',                  ssthresh: 16, events: [] },
];
const SSTHRESH_CHOICES = [8, 12, 16, 24, 32];

const halve = (cwnd) => Math.max(Math.floor(cwnd / 2), 2);

function generateSteps({ variant, ssthresh: initial, events }) {
    const steps = [];
    let cwnd = 1, ssthresh = initial, sentBefore = 0;
    const byRound = Object.fromEntries(events.map(e => [e.round, e.type]));
    const name = variant === 'reno' ? 'Reno' : 'Tahoe';

    for (let round = 1; round <= ROUNDS; round++) {
        /* Three duplicate ACKs need three segments sent after the lost one, so
           with fewer than four in flight the loss can only surface as a timeout. */
        const asked = byRound[round] ?? null;
        const downgraded = asked === 'dup' && cwnd < 4;
        const event = downgraded ? 'timeout' : asked;
        const phase = cwnd < ssthresh ? 'slow start' : 'congestion avoidance';
        let nextCwnd, nextSsthresh = ssthresh, rule;
        const lostSeg = event ? sentBefore + Math.ceil(cwnd / 2) : null;

        if (event === 'timeout') {
            nextSsthresh = halve(cwnd);
            nextCwnd = 1;
            rule = downgraded
                ? `Segment ${lostSeg} is lost, but with only ${cwnd} segment${cwnd > 1 ? 's' : ''} in flight there are not three later segments to trigger three duplicate ACKs. The loss is only noticed when the retransmission timer expires: ssthresh = max(⌊${cwnd}/2⌋, 2) = ${nextSsthresh} and cwnd = 1.`
                : `Segment ${lostSeg} is lost and so is every ACK that would have followed — the retransmission timer expires with nothing coming back. ${name} reads silence as serious congestion: ssthresh = max(⌊${cwnd}/2⌋, 2) = ${nextSsthresh} and cwnd collapses to 1. Slow start begins again.`;
        } else if (event === 'dup') {
            nextSsthresh = halve(cwnd);
            if (variant === 'reno') {
                nextCwnd = nextSsthresh;
                rule = `Segment ${lostSeg} is lost, but the segments after it still arrive, and each one makes the receiver repeat its last ACK. On the third duplicate Reno fast-retransmits ${lostSeg} without waiting for the timer, sets ssthresh = max(⌊${cwnd}/2⌋, 2) = ${nextSsthresh}, and enters fast recovery — continuing from cwnd = ${nextCwnd} in congestion avoidance instead of starting over.`;
            } else {
                nextCwnd = 1;
                rule = `Segment ${lostSeg} is lost and three duplicate ACKs arrive. Tahoe also fast-retransmits ${lostSeg} straight away, but it then treats this like any other loss: ssthresh = max(⌊${cwnd}/2⌋, 2) = ${nextSsthresh} and cwnd = 1, back into slow start.`;
            }
        } else if (cwnd < ssthresh) {
            nextCwnd = Math.min(cwnd * 2, ssthresh);
            rule = nextCwnd === cwnd * 2
                ? `All ${cwnd} segment${cwnd > 1 ? 's are' : ' is'} acknowledged. In slow start each ACK grows cwnd by one segment, so the window doubles every round trip: ${cwnd} → ${nextCwnd}.`
                : `All ${cwnd} segments are acknowledged. Doubling would give ${cwnd * 2}, past ssthresh = ${ssthresh}, so cwnd stops at ${nextCwnd} and the connection switches to congestion avoidance.`;
        } else {
            nextCwnd = cwnd + 1;
            rule = `All ${cwnd} segments are acknowledged. In congestion avoidance cwnd grows by about one segment per round trip — additive increase: ${cwnd} → ${nextCwnd}.`;
        }

        const intro = round === 1
            ? `The connection has just been established. cwnd starts at 1 segment and ssthresh at ${ssthresh}, a guess at where the network's capacity lies. `
            : '';
        steps.push({
            round, variant, cwnd, ssthresh, phase, event, downgraded, lostSeg, sentBefore,
            nextCwnd, nextSsthresh,
            explanation: `${intro}Round ${round}: cwnd = ${cwnd}, ssthresh = ${ssthresh} (${phase}). ${rule}`,
        });
        sentBefore += cwnd;
        cwnd = nextCwnd;
        ssthresh = nextSsthresh;
    }
    const total = steps.reduce((a, s) => a + s.cwnd, 0);
    steps.push({
        round: ROUNDS + 1, variant, cwnd, ssthresh, phase: cwnd < ssthresh ? 'slow start' : 'congestion avoidance',
        event: null, lostSeg: null, sentBefore, nextCwnd: null, nextSsthresh: null, final: true, total,
        explanation: `After ${ROUNDS} round trips ${name} has sent ${total} segments and cwnd stands at ${cwnd}. Each loss cut the rate, each quiet round trip added one segment — the additive-increase, multiplicative-decrease sawtooth that lets many TCP flows share a link fairly.`,
    });
    return steps;
}

/* Asked where the next cwnd is not just "double again" or "plus one": at every
   loss, where slow start is about to hit ssthresh, at the first round of
   congestion avoidance, and on round 1 to set the pattern. The event for this
   round is shown on screen, so the rule decides the answer. */
const predictFor = (step, next) => {
    if (!step || !next || step.final) return null;
    const { cwnd, ssthresh, event, round } = step;
    const capRound = !event && cwnd < ssthresh && cwnd * 2 > ssthresh;
    const firstCa = !event && cwnd === ssthresh;
    if (!event && !capRound && !firstCa && round !== 1) return null;

    const pool = [next.cwnd, cwnd * 2, cwnd + 1, 1, halve(cwnd), ssthresh];
    const vals = [];
    for (const v of pool) if (!vals.includes(v) && vals.length < 4) vals.push(v);
    vals.sort((a, b) => a - b);
    const r = round % vals.length;
    const ordered = [...vals.slice(r), ...vals.slice(0, r)];
    const what = event === 'timeout' ? 'a retransmission timeout'
        : event === 'dup' ? 'three duplicate ACKs'
        : 'every segment acknowledged';
    const because = event === 'timeout'
        ? `A timeout always resets cwnd to 1, whichever variant; ssthresh becomes ⌊${cwnd}/2⌋ = ${halve(cwnd)}.`
        : event === 'dup'
            ? (step.variant === 'reno'
                ? `Reno halves on three duplicate ACKs: ssthresh = ⌊${cwnd}/2⌋ = ${halve(cwnd)}, and cwnd continues from there.`
                : 'Tahoe has no fast recovery: any loss, even one signalled by duplicate ACKs, sends cwnd back to 1.')
            : capRound
                ? `Slow start doubles, but never past ssthresh = ${ssthresh}.`
                : firstCa
                    ? `cwnd has reached ssthresh, so growth is now additive: +1 per round trip.`
                    : 'In slow start every ACK adds a segment, so one round trip doubles cwnd.';
    return {
        question: `Round ${round} (${step.variant === 'reno' ? 'Reno' : 'Tahoe'}): cwnd = ${cwnd}, ssthresh = ${ssthresh}, and the round ends with ${what}. What is cwnd for round ${round + 1}?`,
        options: ordered.map(v => `cwnd = ${v}`),
        correct: ordered.indexOf(next.cwnd),
        because,
    };
};

const quizQuestions = [
    {
        question: 'A TCP Reno sender has cwnd = 20 segments when three duplicate ACKs arrive. What are ssthresh and cwnd afterwards (ignoring the temporary +3 inflation)?',
        options: ['ssthresh 20, cwnd 1', 'ssthresh 10, cwnd 1', 'ssthresh 10, cwnd 10', 'ssthresh 19, cwnd 19'],
        correct: 2,
        explanation: 'Reno halves on a triple duplicate ACK: ssthresh = 20 / 2 = 10, and fast recovery lets cwnd continue from ssthresh in congestion avoidance. Tahoe — or any sender after a timeout — would drop cwnd to 1.',
    },
    {
        question: 'Why does Reno react more gently to three duplicate ACKs than to a timeout?',
        options: [
            'Duplicate ACKs are cheaper to process',
            'Duplicate ACKs prove later segments are still getting through, so the path is only mildly congested; a timeout means nothing is getting through',
            'Timeouts only happen on wireless links',
            'Three duplicate ACKs mean the segment was not actually lost',
        ],
        correct: 1,
        explanation: 'Each duplicate ACK is triggered by a segment that did arrive, after the lost one. Three of them mean data is still flowing, so halving is enough. A timeout means the sender heard nothing for a full RTO — the conservative response is to start again from 1.',
    },
    {
        question: 'In slow start, how does cwnd grow?',
        options: [
            'By one segment per round trip',
            'It doubles every round trip, because every ACK adds one segment',
            'It is set to the receiver\'s advertised window immediately',
            'It grows by one segment per lost packet',
        ],
        correct: 1,
        explanation: 'Every ACK increases cwnd by one segment. A window of cwnd segments produces cwnd ACKs per round trip, so cwnd doubles each RTT — exponential growth, despite the name. Once cwnd reaches ssthresh, congestion avoidance adds just one segment per RTT.',
    },
];

function QuizPanel({ quizState, setQuizState }) {
    const q = quizQuestions[quizState.current];
    if (quizState.complete) {
        return (
            <div className="text-center py-2">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{quizQuestions.length}</div>
                <div className="text-pink-300/80 text-sm mb-4">{quizState.score === quizQuestions.length ? 'Perfect — you can read a cwnd trace.' : 'Compare Reno and Tahoe on the same losses, then retry.'}</div>
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

// ── Chart ─────────────────────────────────────────────────────────────────────
const PL = 46, PR = 742, PT = 22, PB = 270;
const xOf = r => PL + (r - 1) * ((PR - PL) / (ROUNDS - 1));
const PHASE_COLOR = { 'slow start': '#38bdf8', 'congestion avoidance': '#f472b6' };

function CwndChart({ steps, ghost, current }) {
    const rounds = steps.filter(s => !s.final);
    const ghostRounds = ghost ? ghost.filter(s => !s.final) : [];
    const maxV = Math.max(...rounds.map(s => Math.max(s.cwnd, s.ssthresh)), ...ghostRounds.map(s => s.cwnd), 8);
    const top = Math.ceil((maxV + 2) / 4) * 4;
    const yOf = v => PB - (v / top) * (PB - PT);
    const shown = rounds.filter(s => s.round <= current);
    const line = shown.map((s, i) => `${i ? 'L' : 'M'}${xOf(s.round)},${yOf(s.cwnd)}`).join(' ');
    // Only up to the current round: until the first loss the two variants
    // coincide, so a ghost drawn ahead would give the next cwnd away.
    const ghostLine = ghostRounds.filter(s => s.round <= current).map((s, i) => `${i ? 'L' : 'M'}${xOf(s.round)},${yOf(s.cwnd)}`).join(' ');
    const half = (PR - PL) / (ROUNDS - 1) / 2;
    const thresh = shown.map((s, i) => `${i ? 'L' : 'M'}${xOf(s.round) - half},${yOf(Math.min(s.ssthresh, top))} L${xOf(s.round) + half},${yOf(Math.min(s.ssthresh, top))}`).join(' ');
    const ticks = Array.from({ length: top / 4 + 1 }, (_, i) => i * 4);

    return (
        <svg viewBox="0 0 760 300" width="100%" className="select-none">
            <style>{`.c-pt { transition: r .3s ease; }`}</style>
            {ticks.map(v => (
                <g key={v}>
                    <line x1={PL} y1={yOf(v)} x2={PR} y2={yOf(v)} stroke="#1e293b" strokeWidth="1" />
                    <text x={PL - 8} y={yOf(v) + 3.5} textAnchor="end" fontSize="9" fill="#64748b" fontFamily="monospace">{v}</text>
                </g>
            ))}
            {rounds.filter(s => s.round % 2 === 1).map(s => (
                <text key={s.round} x={xOf(s.round)} y={PB + 16} textAnchor="middle" fontSize="9" fill="#64748b" fontFamily="monospace">{s.round}</text>
            ))}
            <text x={(PL + PR) / 2} y={PB + 30} textAnchor="middle" fontSize="9" fill="#475569" fontFamily="monospace">round trip (RTT)</text>
            <text x={12} y={PT + 4} fontSize="9" fill="#475569" fontFamily="monospace">cwnd</text>

            {ghost && <path d={ghostLine} fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 4" opacity="0.55" />}
            <path d={thresh} fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.8" />
            <path d={line} fill="none" stroke="#f472b6" strokeWidth="2.4" strokeLinejoin="round" />

            {shown.map(s => {
                const cur = s.round === current;
                return (
                    <g key={s.round}>
                        <circle cx={xOf(s.round)} cy={yOf(s.cwnd)} r={cur ? 6 : 3.6} className="c-pt"
                            fill={PHASE_COLOR[s.phase]} stroke={cur ? '#ffffff' : '#0f172a'} strokeWidth={cur ? 2 : 1} />
                        {s.event === 'timeout' && (
                            <g transform={`translate(${xOf(s.round)}, ${yOf(s.cwnd) - 15})`}>
                                <line x1={-5} y1={-5} x2={5} y2={5} stroke="#f87171" strokeWidth="2.4" />
                                <line x1={-5} y1={5} x2={5} y2={-5} stroke="#f87171" strokeWidth="2.4" />
                            </g>
                        )}
                        {s.event === 'dup' && (
                            <path d={`M${xOf(s.round)},${yOf(s.cwnd) - 21} l6,10 l-12,0 Z`} fill="#fbbf24" />
                        )}
                        {cur && (
                            <text x={xOf(s.round) + (s.round > ROUNDS - 3 ? -10 : 10)} y={yOf(s.cwnd) - 8}
                                textAnchor={s.round > ROUNDS - 3 ? 'end' : 'start'} fontSize="11" fontWeight="700" fill="#f8fafc" fontFamily="monospace">{s.cwnd}</text>
                        )}
                    </g>
                );
            })}
        </svg>
    );
}

function SegmentStrip({ step }) {
    if (step.final) return null;
    const lostIdx = step.event ? step.lostSeg - step.sentBefore - 1 : -1;
    return (
        <div>
            <div className="flex flex-wrap items-center gap-1">
                {Array.from({ length: step.cwnd }).map((_, i) => {
                    const lost = i === lostIdx;
                    const afterLoss = lostIdx >= 0 && i > lostIdx;
                    return (
                        <div key={i} title={`segment ${step.sentBefore + i + 1}`}
                            className={`relative w-5 h-6 rounded-sm border text-[8px] flex items-center justify-center font-mono transition-colors ${
                                lost ? 'bg-red-500/30 border-red-500 text-red-200'
                                : afterLoss && step.event === 'timeout' ? 'bg-slate-800 border-slate-700 text-slate-600'
                                : 'bg-pink-500/20 border-pink-500/50 text-pink-200'}`}>
                            {lost ? '×' : ''}
                        </div>
                    );
                })}
                {step.event === 'dup' && (
                    <span className="ml-2 text-[10px] font-mono text-amber-300">→ dup ACK · dup ACK · dup ACK</span>
                )}
                {step.event === 'timeout' && (
                    <span className="ml-2 text-[10px] font-mono text-red-300">→ silence until the RTO fires</span>
                )}
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
                Round {step.round}: segments {step.sentBefore + 1}–{step.sentBefore + step.cwnd} in flight
                {step.event ? ` · segment ${step.lostSeg} lost` : ''}
            </p>
        </div>
    );
}

const codeExample = `def next_window(cwnd, ssthresh, event, reno=True):
    """One round trip of TCP congestion control, in segments."""
    if event == 'timeout' or (event == 'dup_acks' and not reno):
        ssthresh = max(cwnd // 2, 2)
        return 1, ssthresh                    # back to slow start
    if event == 'dup_acks':                   # Reno: fast retransmit + recovery
        ssthresh = max(cwnd // 2, 2)
        return ssthresh, ssthresh             # multiplicative decrease
    if cwnd < ssthresh:
        return min(cwnd * 2, ssthresh), ssthresh   # slow start: double per RTT
    return cwnd + 1, ssthresh                 # additive increase

cwnd, ssthresh = 1, 16
losses = {9: 'dup_acks', 17: 'timeout'}
for rtt in range(1, 25):
    print(rtt, cwnd, ssthresh)
    cwnd, ssthresh = next_window(cwnd, ssthresh, losses.get(rtt))`;

export default function CongestionControlPage() {
    const [variant, setVariant] = useState('reno');
    const [preset, setPreset] = useState(PRESETS[0]);
    const [events, setEvents] = useState(PRESETS[0].events);
    const [ssthresh, setSsthresh] = useState(PRESETS[0].ssthresh);
    const [compare, setCompare] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(900);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const stepHistory = useMemo(() => generateSteps({ variant, ssthresh, events }), [variant, ssthresh, events]);
    const ghost = useMemo(() => generateSteps({ variant: variant === 'reno' ? 'tahoe' : 'reno', ssthresh, events }), [variant, ssthresh, events]);

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
    const applyPreset = (p) => { setPreset(p); setEvents(p.events); setSsthresh(p.ssthresh); restart(); };
    const cycleEvent = (round) => {
        const cur = events.find(e => e.round === round)?.type ?? null;
        const nextType = cur === null ? 'dup' : cur === 'dup' ? 'timeout' : null;
        const rest = events.filter(e => e.round !== round);
        setEvents(nextType ? [...rest, { round, type: nextType }].sort((a, b) => a.round - b.round) : rest);
        setPreset(null);
        restart();
    };
    const shuffle = () => {
        const out = [];
        let r = 4 + Math.floor(Math.random() * 4);
        while (r < ROUNDS - 1 && out.length < 4) {
            out.push({ round: r, type: Math.random() < 0.65 ? 'dup' : 'timeout' });
            r += 3 + Math.floor(Math.random() * 5);
        }
        setEvents(out);
        setSsthresh(SSTHRESH_CHOICES[Math.floor(Math.random() * SSTHRESH_CHOICES.length)]);
        setPreset(null);
        restart();
    };

    const shownRound = step.final ? ROUNDS : step.round;
    const totals = { [variant]: stepHistory[stepHistory.length - 1].total, [ghost[0].variant]: ghost[ghost.length - 1].total };

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-pink-500 to-rose-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/computer-networks" className="flex items-center text-white hover:text-pink-100 transition-colors mb-6 w-fit">
                        <ArrowLeft className="h-5 w-5 mr-2" />Back to Computer Networks
                    </Link>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">TCP Congestion Control</h1>
                        <p className="text-lg text-pink-100 mb-6 max-w-3xl mx-auto">
                            How fast should a sender go on a network it cannot see? Probe upward, back off on loss — and watch
                            the congestion window saw.
                        </p>
                        <div className="flex flex-wrap justify-center gap-3 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Slow start: ×2 per RTT</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Avoidance: +1 per RTT</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Loss: ÷2</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <div className="flex flex-wrap items-center gap-2 mb-4">
                                {VARIANTS.map(v => (
                                    <button key={v.id} onClick={() => { setVariant(v.id); restart(); }}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${variant === v.id
                                            ? 'bg-pink-500/20 border-pink-500/60 text-pink-200' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'}`}>
                                        {v.label}
                                    </button>
                                ))}
                                <button onClick={() => setCompare(c => !c)} aria-pressed={compare}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${compare
                                        ? 'bg-slate-700 border-slate-500 text-slate-100' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                                    <GitCompare className="h-3.5 w-3.5" />Ghost of {variant === 'reno' ? 'Tahoe' : 'Reno'}
                                </button>
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
                                <label className="block text-sm font-medium mb-2 text-slate-300">Animation Speed: {speed}ms per RTT</label>
                                <input type="range" min="200" max="2000" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-full max-w-md accent-pink-500" />
                            </div>

                            <div className="grid grid-cols-3 gap-3 mb-4">
                                {[
                                    ['cwnd', step.cwnd, 'text-pink-300'],
                                    ['ssthresh', step.ssthresh, 'text-amber-300'],
                                    ['phase', step.phase, step.phase === 'slow start' ? 'text-sky-300' : 'text-pink-300'],
                                ].map(([k, v, tone]) => (
                                    <div key={k} className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2">
                                        <div className="text-[10px] uppercase tracking-widest text-slate-500">{k}</div>
                                        <div className={`font-mono font-bold ${typeof v === 'number' ? 'text-2xl' : 'text-sm mt-1.5'} ${tone}`}>{v}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-slate-950/60 rounded-lg border border-slate-800 p-2">
                                <CwndChart steps={stepHistory} ghost={compare ? ghost : null} current={shownRound} />
                            </div>
                            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-2 text-xs text-slate-400">
                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-sky-400" />slow start</span>
                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-pink-400" />congestion avoidance</span>
                                <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-amber-400" />ssthresh</span>
                                <span className="flex items-center gap-1.5 text-amber-300">▲ 3 dup ACKs</span>
                                <span className="flex items-center gap-1.5 text-red-300">× timeout</span>
                                {compare && <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dotted border-slate-400" />{variant === 'reno' ? 'Tahoe' : 'Reno'}, same losses</span>}
                            </div>

                            <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                                <SegmentStrip step={step} />
                                {step.final && <p className="text-[11px] text-slate-400">Reno sent {totals.reno} segments, Tahoe {totals.tahoe}, over the same {ROUNDS} round trips and the same losses.</p>}
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

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-3">Losses and Threshold</h3>
                            <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs text-slate-500 mr-1">Presets</span>
                                    {PRESETS.map(p => (
                                        <button key={p.id} onClick={() => applyPreset(p)}
                                            className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${preset?.id === p.id ? 'bg-pink-500/20 border-pink-500/60 text-pink-200' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-pink-500/60'}`}>{p.label}</button>
                                    ))}
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs text-slate-500 mr-1">Initial ssthresh</span>
                                    {SSTHRESH_CHOICES.map(v => (
                                        <button key={v} onClick={() => { setSsthresh(v); setPreset(null); restart(); }}
                                            className={`px-2 py-0.5 rounded text-xs font-mono border ${ssthresh === v ? 'bg-amber-500/20 border-amber-500/60 text-amber-200' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>{v}</button>
                                    ))}
                                </div>
                                <div className="flex flex-wrap items-center gap-1">
                                    <span className="text-xs text-slate-500 w-24">Loss in round</span>
                                    {Array.from({ length: ROUNDS - 1 }, (_, i) => i + 1).map(r => {
                                        const type = events.find(e => e.round === r)?.type;
                                        return (
                                            <button key={r} onClick={() => cycleEvent(r)} title="click: none → 3 dup ACKs → timeout"
                                                className={`w-7 h-7 rounded text-[10px] font-mono border transition-colors ${type === 'dup' ? 'bg-amber-500/25 border-amber-500 text-amber-200'
                                                    : type === 'timeout' ? 'bg-red-500/25 border-red-500 text-red-200' : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-500'}`}>
                                                {r}
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="text-[11px] text-slate-600">Click a round to cycle: no loss → three duplicate ACKs (amber) → timeout (red).</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <TrendingUp className="h-5 w-5 text-pink-400" />
                                <h3 className="font-bold text-white">The Rules</h3>
                            </div>
                            {/* blurred while a prediction is open: this card states the rule being asked about */}
                            {predict.hideExplanation && <p className="text-[11px] text-pink-300/80 mb-2">Hidden until you answer the prediction.</p>}
                            <div className={`space-y-2 text-xs transition ${predict.hideExplanation ? 'blur-sm select-none' : ''}`}>
                                {[
                                    { on: !step.event && step.phase === 'slow start', k: 'No loss, cwnd < ssthresh', v: 'cwnd ×2 (capped at ssthresh)' },
                                    { on: !step.event && step.phase !== 'slow start', k: 'No loss, cwnd ≥ ssthresh', v: 'cwnd + 1' },
                                    { on: step.event === 'dup' && step.variant === 'reno', k: '3 dup ACKs — Reno', v: 'ssthresh = cwnd/2, cwnd = ssthresh' },
                                    { on: step.event === 'dup' && step.variant === 'tahoe', k: '3 dup ACKs — Tahoe', v: 'ssthresh = cwnd/2, cwnd = 1' },
                                    { on: step.event === 'timeout', k: 'Timeout — both', v: 'ssthresh = cwnd/2, cwnd = 1' },
                                ].map(row => (
                                    <div key={row.k} className={`flex justify-between gap-3 px-2 py-1.5 rounded-lg transition-colors ${row.on && !step.final ? 'bg-pink-500/15 text-pink-200' : 'text-slate-500'}`}>
                                        <span>{row.k}</span>
                                        <span className="font-mono text-[10px] text-right">{row.v}</span>
                                    </div>
                                ))}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
                                Real stacks start with ssthresh effectively unlimited, so the first loss ends slow start; most of
                                Linux today runs CUBIC, which keeps this loss response but grows cwnd along a cubic curve.
                            </p>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">Knowledge Check</h3>
                            <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <button onClick={() => setShowCode(c => !c)} className="flex items-center gap-2 text-pink-400 hover:text-pink-300 font-medium">
                                <Code2 className="h-5 w-5" />{showCode ? 'Hide' : 'Show'} Python: one RTT of Reno and Tahoe
                            </button>
                            {showCode && <div className="mt-4"><CodeBlock code={codeExample} language="python" /></div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
