"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Info, Clock, Code2, Shuffle, Boxes, Check, X, AlertTriangle } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

const quizQuestions = [
    {
        question: 'A 30 KB request fails even though 45 KB of memory is free. What is this called?',
        options: ['Internal fragmentation', 'External fragmentation', 'Thrashing', 'A memory leak'],
        correct: 1,
        explanation: 'External fragmentation: the free memory exists, but it is split into holes that are each smaller than the request. Internal fragmentation is the opposite problem — space wasted inside an allocated block that is bigger than asked for.',
    },
    {
        question: 'What does best fit tend to leave behind?',
        options: [
            'One very large hole at the end of memory',
            'Many tiny leftover holes that are too small to use',
            'No holes at all, so it never needs compaction',
            'Holes only at the start of memory',
        ],
        correct: 1,
        explanation: 'Best fit picks the tightest hole, so the leftover is as small as possible — often a sliver nobody can ever use. Worst fit tries to avoid that by leaving the biggest leftover, but it eats the large holes that big requests need.',
    },
    {
        question: 'What must be true for the OS to compact memory?',
        options: [
            'Processes must be stopped forever',
            'Addresses must be bound at compile time',
            'Processes must be relocatable at run time, because their blocks move',
            'Every hole must be the same size',
        ],
        correct: 2,
        explanation: 'Compaction physically moves blocks, so every moved process must have its base address updated — which needs run-time address binding (a relocation or base register). It is also expensive: every moved byte is copied.',
    },
];

const MEM = 100;
const OS_END = 12;
const COLORS = ['#f59e0b', '#38bdf8', '#34d399', '#f472b6', '#a78bfa', '#a3e635', '#fb923c', '#2dd4bf', '#e879f9', '#facc15'];

const POLICIES = {
    first: { label: 'First fit', rule: 'Scan from the lowest address and take the first hole big enough.' },
    best: { label: 'Best fit', rule: 'Check every hole and take the smallest one that is big enough.' },
    worst: { label: 'Worst fit', rule: 'Check every hole and take the largest one, leaving the biggest leftover.' },
    next: { label: 'Next fit', rule: 'Like first fit, but resume scanning where the last allocation ended, wrapping around.' },
};
const POLICY_ORDER = ['first', 'best', 'worst', 'next'];

const PRESETS = [
    {
        name: 'Fragmentation',
        note: 'Every policy strands F; compaction rescues it.',
        ops: [
            { op: 'alloc', name: 'A', size: 8 }, { op: 'alloc', name: 'B', size: 18 }, { op: 'free', name: 'A' },
            { op: 'alloc', name: 'C', size: 12 }, { op: 'alloc', name: 'D', size: 14 }, { op: 'alloc', name: 'E', size: 24 },
            { op: 'free', name: 'C' }, { op: 'alloc', name: 'F', size: 20 },
        ],
    },
    {
        name: 'Best fit wins',
        note: 'Worst and next fit put D into the big free area, so G (20 KB) later finds no hole.',
        ops: [
            { op: 'alloc', name: 'A', size: 18 }, { op: 'alloc', name: 'B', size: 10 }, { op: 'alloc', name: 'C', size: 16 },
            { op: 'free', name: 'A' }, { op: 'alloc', name: 'D', size: 6 }, { op: 'alloc', name: 'E', size: 24 },
            { op: 'alloc', name: 'F', size: 10 }, { op: 'free', name: 'D' }, { op: 'alloc', name: 'G', size: 20 },
        ],
    },
    {
        name: 'Worst fit wins',
        note: 'First and best fit put D into the 16 KB hole that G needs later; worst fit does not.',
        ops: [
            { op: 'alloc', name: 'A', size: 16 }, { op: 'alloc', name: 'B', size: 20 }, { op: 'alloc', name: 'C', size: 10 },
            { op: 'free', name: 'C' }, { op: 'free', name: 'A' }, { op: 'alloc', name: 'D', size: 4 },
            { op: 'alloc', name: 'E', size: 16 }, { op: 'alloc', name: 'F', size: 24 }, { op: 'alloc', name: 'G', size: 16 },
        ],
    },
    {
        name: 'Next fit stumbles',
        note: 'Only next fit fails: its roving pointer has moved past the hole the others reuse.',
        ops: [
            { op: 'alloc', name: 'A', size: 16 }, { op: 'alloc', name: 'B', size: 22 }, { op: 'alloc', name: 'C', size: 12 },
            { op: 'free', name: 'C' }, { op: 'alloc', name: 'D', size: 20 }, { op: 'free', name: 'B' },
            { op: 'alloc', name: 'E', size: 12 }, { op: 'alloc', name: 'F', size: 6 }, { op: 'free', name: 'E' },
            { op: 'alloc', name: 'G', size: 24 },
        ],
    },
];

function holesOf(blocks) {
    const holes = [];
    let cur = OS_END;
    for (const b of blocks) {
        if (b.start > cur) holes.push({ start: cur, size: b.start - cur });
        cur = b.start + b.size;
    }
    if (cur < MEM) holes.push({ start: cur, size: MEM - cur });
    return holes;
}

/* Which holes a policy examines, in order, and which one it takes. */
function chooseHole(holes, size, policy, ptr) {
    const probes = [];
    if (policy === 'first' || policy === 'next') {
        let from = 0;
        if (policy === 'next') {
            from = holes.findIndex(h => h.start + h.size > ptr);
            if (from < 0) from = 0;
        }
        for (let k = 0; k < holes.length; k++) {
            const h = holes[(from + k) % holes.length];
            const fits = h.size >= size;
            probes.push({ start: h.start, size: h.size, fits });
            if (fits) return { probes, chosen: h.start };
        }
        return { probes, chosen: null };
    }
    let chosen = null;
    let chosenSize = null;
    for (const h of holes) {
        const fits = h.size >= size;
        probes.push({ start: h.start, size: h.size, fits });
        if (!fits) continue;
        const better = chosen === null
            || (policy === 'best' ? h.size < chosenSize : h.size > chosenSize);
        if (better) { chosen = h.start; chosenSize = h.size; }
    }
    return { probes, chosen };
}

function generateSteps(ops, policy, compactOnFail) {
    let blocks = [];
    let ptr = OS_END;
    const failed = [];
    let compactions = 0;
    const steps = [];
    const colorOf = {};
    ops.forEach(o => { if (o.op === 'alloc' && colorOf[o.name] === undefined) colorOf[o.name] = Object.keys(colorOf).length % COLORS.length; });

    const sorted = () => blocks.sort((a, b) => a.start - b.start);
    const snap = (extra) => {
        const holes = holesOf(blocks);
        const free = holes.reduce((s, h) => s + h.size, 0);
        const largest = holes.reduce((m, h) => Math.max(m, h.size), 0);
        return {
            policy, ops, colorOf, ptr,
            blocks: blocks.map(b => ({ ...b })),
            holes, free, largest,
            failed: [...failed], compactions,
            opIndex: null, request: null, probes: [], chosen: null,
            ...extra,
        };
    };
    const list = (hs) => hs.map(h => `${h.size} KB @ ${h.start}`).join(', ');

    steps.push(snap({
        phase: 'start',
        explanation: `${MEM} KB of memory with the OS in the first ${OS_END} KB. Everything else is one free hole. ${POLICIES[policy].label}: ${POLICIES[policy].rule}`,
    }));

    ops.forEach((o, i) => {
        if (o.op === 'free') {
            const b = blocks.find(x => x.name === o.name);
            if (!b) {
                steps.push(snap({ phase: 'free', opIndex: i, explanation: `Free ${o.name}: it never got memory (its request failed), so there is nothing to release.` }));
                return;
            }
            const before = holesOf(blocks);
            blocks = blocks.filter(x => x !== b);
            const leftHole = before.find(h => h.start + h.size === b.start);
            const rightHole = before.find(h => h.start === b.start + b.size);
            let merge = '';
            if (leftHole && rightHole) merge = ` It merges with the holes on both sides into one ${leftHole.size + b.size + rightHole.size} KB hole.`;
            else if (leftHole) merge = ` It merges with the hole below it into one ${leftHole.size + b.size} KB hole.`;
            else if (rightHole) merge = ` It merges with the hole above it into one ${b.size + rightHole.size} KB hole.`;
            else merge = ' Both neighbours are allocated, so it becomes a separate hole.';
            steps.push(snap({ phase: 'free', opIndex: i, freed: { start: b.start, size: b.size }, explanation: `${o.name} exits and releases ${b.size} KB at address ${b.start}.${merge}` }));
            return;
        }

        const holes = holesOf(blocks);
        steps.push(snap({
            phase: 'request', opIndex: i, request: o,
            explanation: `${o.name} asks for ${o.size} KB. Free holes: ${holes.length ? list(holes) : 'none'}.${policy === 'next' ? ` The roving pointer is at ${ptr}.` : ''}`,
        }));

        const place = (probes, chosen, retry) => {
            blocks.push({ name: o.name, start: chosen, size: o.size });
            sorted();
            ptr = chosen + o.size;
            const hole = probes.find(p => p.start === chosen);
            const left = hole.size - o.size;
            let why;
            if (retry) why = 'After compaction there is one hole, and it fits.';
            else if (policy === 'first') why = `It is the first hole from the bottom that fits${probes.length > 1 ? ` (${probes.length - 1} too small before it)` : ''}.`;
            else if (policy === 'next') why = `Scanning from the roving pointer, it is the first hole that fits${probes.length > 1 ? ` (${probes.length - 1} skipped)` : ''}.`;
            else if (policy === 'best') why = `Of the ${probes.filter(p => p.fits).length} holes that fit, it is the smallest.`;
            else why = `Of the ${probes.filter(p => p.fits).length} holes that fit, it is the largest.`;
            steps.push(snap({
                phase: 'place', opIndex: i, request: o, probes, chosen, retry,
                explanation: `${o.name} gets ${o.size} KB at address ${chosen} — the ${hole.size} KB hole. ${why} ${left > 0 ? `A ${left} KB hole is left over.` : 'It fits exactly; no hole is left.'}`,
            }));
        };

        const { probes, chosen } = chooseHole(holes, o.size, policy, ptr);
        if (chosen !== null) {
            place(probes, chosen, false);
            return;
        }
        const free = holes.reduce((s, h) => s + h.size, 0);
        const fragmented = free >= o.size;
        steps.push(snap({
            phase: 'fail', opIndex: i, request: o, probes,
            explanation: fragmented
                ? `No single hole holds ${o.size} KB, yet ${free} KB is free in total. That gap is external fragmentation: the space exists, but not in one piece.${compactOnFail ? ' The OS compacts memory.' : ' The request fails.'}`
                : `Only ${free} KB is free in total, less than the ${o.size} KB requested. No policy and no compaction could satisfy it — the request fails.`,
        }));
        if (fragmented && compactOnFail) {
            let cur = OS_END;
            const moved = [];
            blocks.forEach(b => { if (b.start !== cur) moved.push(b.name); b.start = cur; cur += b.size; });
            ptr = cur;
            compactions++;
            steps.push(snap({
                phase: 'compact', opIndex: i, request: o,
                explanation: `Compaction slides ${moved.length ? moved.join(', ') : 'every block'} down towards the OS, so all ${free} KB of free space becomes one hole at ${cur}. Each moved process needs its base address updated, and every byte is copied — this is not cheap.`,
            }));
            const after = holesOf(blocks);
            const retry = chooseHole(after, o.size, policy, ptr);
            place(retry.probes, retry.chosen, true);
        } else {
            failed.push(o.name);
        }
    });

    const end = snap({ phase: 'done' });
    const frag = end.free ? Math.round((1 - end.largest / end.free) * 100) : 0;
    end.explanation = `Workload finished. ${end.failed.length ? `${end.failed.length} request${end.failed.length === 1 ? '' : 's'} failed (${end.failed.join(', ')}). ` : 'Every request was served. '}${compactions ? `${compactions === 1 ? 'One compaction was' : `${compactions} compactions were`} needed. ` : ''}${end.holes.length === 1 ? '1 hole remains' : `${end.holes.length} holes remain`}, ${end.free} KB free, the largest ${end.largest} KB — ${frag}% of free memory sits outside the largest hole.`;
    steps.push(end);
    return steps;
}

const holeLabel = (h) => `Hole @ ${h.start} (${h.size} KB)`;
const NONE = 'No hole fits — the request fails';

/* At a request, the holes on screen and the request size decide the pick (and
   for next fit, the roving pointer). The next step places the block or fails.
   Options are the holes by address plus "fails", rotated by the operation's
   position plus the request size, so first fit's answer is not always the
   first button (rotating by position alone still favoured it: every random
   workload opens with an allocation into the single hole at position 0). */
function predictFor(step, next) {
    if (!step || !next) return null;
    if (step.phase !== 'request') return null;
    if (next.phase !== 'place' && next.phase !== 'fail') return null;
    // Memory completely full: there is no choice to make.
    if (step.holes.length === 0) return null;
    const base = [...step.holes.map(holeLabel), NONE];
    const shift = (step.opIndex + step.request.size) % base.length;
    const options = [...base.slice(shift), ...base.slice(0, shift)];
    const size = step.request.size;
    let label;
    let because;
    if (next.phase === 'fail') {
        label = NONE;
        because = step.free >= size
            ? `Every hole is smaller than ${size} KB, even though ${step.free} KB is free in total.`
            : `Only ${step.free} KB is free in all.`;
    } else {
        const h = step.holes.find(x => x.start === next.chosen);
        label = holeLabel(h);
        const fits = step.holes.filter(x => x.size >= size);
        if (step.policy === 'first') because = `Scanning up from address ${OS_END}, it is the first hole of at least ${size} KB.`;
        else if (step.policy === 'next') because = `The scan starts at the hole holding the roving pointer (${step.ptr}) and wraps; this is the first hole of at least ${size} KB it meets.`;
        else if (step.policy === 'best') because = `${fits.length} hole${fits.length === 1 ? '' : 's'} fit; this one is the smallest, leaving ${h.size - size} KB.${fits.filter(x => x.size === h.size).length > 1 ? ' Ties go to the lower address.' : ''}`;
        else because = `${fits.length} hole${fits.length === 1 ? '' : 's'} fit; this one is the largest, leaving ${h.size - size} KB.${fits.filter(x => x.size === h.size).length > 1 ? ' Ties go to the lower address.' : ''}`;
    }
    return {
        question: `${step.request.name} needs ${size} KB. Where does ${POLICIES[step.policy].label.toLowerCase()} put it?`,
        options,
        correct: options.indexOf(label),
        because,
    };
}

const randomOps = () => {
    const names = 'ABCDEFGHIJ'.split('');
    const ops = [];
    const live = [];
    let n = 0;
    for (let k = 0; k < 10 && n < names.length; k++) {
        if (live.length >= 2 && Math.random() < 0.35) {
            const j = Math.floor(Math.random() * live.length);
            ops.push({ op: 'free', name: live[j] });
            live.splice(j, 1);
        } else {
            const name = names[n++];
            ops.push({ op: 'alloc', name, size: 5 + Math.floor(Math.random() * 20) });
            live.push(name);
        }
    }
    return ops;
};

function MemoryBar({ step, showOutcome }) {
    const pct = (v) => `${(v / MEM) * 100}%`;
    const isProbeStep = (step.phase === 'place' || step.phase === 'fail') && showOutcome;
    const probes = isProbeStep ? step.probes : [];
    const bounds = [...new Set([0, OS_END, MEM, ...step.blocks.flatMap(b => [b.start, b.start + b.size])])].sort((a, b) => a - b);
    return (
        <div className="pt-9">
            <div className="relative h-20 rounded-lg border border-slate-700 overflow-visible"
                style={{ background: 'repeating-linear-gradient(135deg, #0f172a, #0f172a 6px, #1e293b 6px, #1e293b 12px)' }}>
                {/* OS */}
                <div className="absolute top-0 bottom-0 rounded-l-lg bg-slate-600 flex items-center justify-center text-xs font-bold text-slate-200"
                    style={{ left: 0, width: pct(OS_END) }}>OS</div>
                {/* probe outlines and order badges */}
                {probes.map((p, k) => {
                    const chosen = p.start === step.chosen;
                    return (
                        <div key={`p${p.start}`} className="absolute top-0 bottom-0 pointer-events-none" style={{ left: pct(p.start), width: pct(p.size) }}>
                            <div className={`absolute inset-0 rounded-md border-2 ${chosen ? 'border-yellow-300' : p.fits ? 'border-green-400/80 border-dashed' : 'border-red-400/80 border-dashed'}`} />
                            <div className={`absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${chosen ? 'bg-yellow-400 text-slate-900' : p.fits ? 'bg-green-500/25 text-green-300' : 'bg-red-500/25 text-red-300'}`}>
                                {k + 1}{p.fits ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                            </div>
                        </div>
                    );
                })}
                {step.phase === 'free' && step.freed && (
                    <div className="absolute top-0 bottom-0 rounded-md border-2 border-dashed border-sky-300 pointer-events-none"
                        style={{ left: pct(step.freed.start), width: pct(step.freed.size) }} />
                )}
                {/* allocated blocks, keyed by name so compaction slides them */}
                {step.blocks.map(b => {
                    const fresh = (step.phase === 'place') && b.name === step.request?.name && showOutcome;
                    return (
                        <div key={b.name}
                            className={`absolute top-1.5 bottom-1.5 rounded-md flex flex-col items-center justify-center font-bold text-slate-900 border ${fresh ? 'border-white ring-2 ring-yellow-300' : 'border-slate-950/40'}`}
                            style={{ left: pct(b.start), width: pct(b.size), background: COLORS[step.colorOf[b.name]], transition: 'left 0.7s ease, width 0.4s ease' }}>
                            <span className="text-sm leading-none">{b.name}</span>
                            {b.size >= 7 && <span className="text-[10px] font-mono leading-none mt-1">{b.size}K</span>}
                        </div>
                    );
                })}
                {step.policy === 'next' && (
                    <div className="absolute -bottom-3 -translate-x-1/2 flex flex-col items-center" style={{ left: pct(step.ptr), transition: 'left 0.6s ease' }}>
                        <div className="w-0 h-0 border-x-[6px] border-x-transparent border-b-[8px] border-b-yellow-400" />
                    </div>
                )}
            </div>
            <div className="relative h-5 mt-3">
                {bounds.map(a => (
                    <span key={a} className="absolute -translate-x-1/2 text-[10px] text-slate-500 font-mono" style={{ left: pct(a) }}>{a}</span>
                ))}
            </div>
        </div>
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

const codeExample = `def holes(blocks, start, end):
    """Free gaps between allocated (addr, size) blocks, sorted by addr."""
    gaps, cur = [], start
    for addr, size in sorted(blocks):
        if addr > cur:
            gaps.append((cur, addr - cur))
        cur = addr + size
    if cur < end:
        gaps.append((cur, end - cur))
    return gaps

def choose(gaps, size, policy, rover=0):
    fits = [g for g in gaps if g[1] >= size]
    if not fits:
        return None                       # caller may compact and retry
    if policy == "first":
        return fits[0]
    if policy == "best":
        return min(fits, key=lambda g: (g[1], g[0]))
    if policy == "worst":
        return max(fits, key=lambda g: (g[1], -g[0]))
    # next fit: first hole at or after the rover, wrapping around
    after = [g for g in gaps if g[0] + g[1] > rover]
    order = after + [g for g in gaps if g not in after]
    return next(g for g in order if g[1] >= size)

def compact(blocks, start):
    """Slide every block down; free space becomes one hole at the top."""
    moved, cur = [], start
    for addr, size in sorted(blocks):
        moved.append((cur, size))         # process must be relocated
        cur += size
    return moved`;

const MemoryAllocationPage = () => {
    const [ops, setOps] = useState(PRESETS[0].ops);
    const [policy, setPolicy] = useState('first');
    const [compactOnFail, setCompactOnFail] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1100);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    useEffect(() => {
        setStepHistory(generateSteps(ops, policy, compactOnFail));
        setCurrentStep(0);
        setIsPlaying(false);
    }, [ops, policy, compactOnFail]);

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

    const comparison = useMemo(() => POLICY_ORDER.map(p => {
        const s = generateSteps(ops, p, false);
        const end = s[s.length - 1];
        const withCompaction = generateSteps(ops, p, true);
        return { key: p, failed: end.failed, holes: end.holes.length, largest: end.largest, free: end.free, compactions: withCompaction[withCompaction.length - 1].compactions };
    }), [ops]);

    const step = stepHistory[currentStep];
    if (!step) return <div className="min-h-screen bg-slate-950" />;
    const frag = step.free ? Math.round((1 - step.largest / step.free) * 100) : 0;

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
                            <Boxes className="h-10 w-10" />Memory Allocation
                        </h1>
                        <p className="text-xl text-yellow-50 mb-6 max-w-3xl mx-auto">
                            Contiguous allocation hands each process one unbroken block. As processes come and go, the free space shatters into holes — and four policies disagree about which hole to use.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">First · Best · Worst · Next fit</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">External fragmentation</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Compaction</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                {POLICY_ORDER.map(k => (
                                    <button key={k} onClick={() => setPolicy(k)}
                                        className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${policy === k
                                            ? 'bg-yellow-500 text-slate-950 border-yellow-400'
                                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-yellow-500/60'}`}>
                                        {POLICIES[k].label}
                                    </button>
                                ))}
                                <label className="ml-auto flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                                    <input type="checkbox" checked={compactOnFail} onChange={e => setCompactOnFail(e.target.checked)} className="accent-yellow-500 w-4 h-4" />
                                    Compact on failure
                                </label>
                            </div>
                            <p className="text-sm text-slate-300 mb-5"><span className="text-yellow-400 font-semibold">{POLICIES[policy].label}.</span> {POLICIES[policy].rule} Ties go to the lower address.</p>

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
                                <button onClick={() => setOps(randomOps())}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium">
                                    <Shuffle size={18} />Randomize
                                </button>
                                <PredictToggle predict={predict} accent="yellow" />
                            </div>

                            <div className="flex flex-wrap items-center gap-2 mb-5">
                                <span className="text-xs text-slate-500 mr-1">Workloads:</span>
                                {PRESETS.map(p => (
                                    <button key={p.name} onClick={() => setOps(p.ops)} title={p.note}
                                        className="px-3 py-1 text-xs rounded-full border border-slate-700 bg-slate-800 text-slate-300 hover:border-yellow-500/60 hover:text-white transition-colors">
                                        {p.name}
                                    </button>
                                ))}
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2 text-slate-300">Animation Speed: {speed}ms</label>
                                <input type="range" min="200" max="2000" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-full max-w-md accent-yellow-500" />
                            </div>

                            <div className="mb-2 flex justify-between items-center">
                                <span className="text-sm font-medium text-slate-300">Step {currentStep + 1} of {stepHistory.length}</span>
                                <span className="text-sm text-slate-500">{step.phase}</span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-2 mb-4">
                                <div className="bg-yellow-500 h-2 rounded-full transition-all duration-300" style={{ width: `${((currentStep + 1) / stepHistory.length) * 100}%` }} />
                            </div>

                            {/* Operation strip */}
                            <div className="flex flex-wrap gap-1.5 mb-2">
                                {step.ops.map((o, i) => {
                                    const isCur = i === step.opIndex;
                                    const isFailed = o.op === 'alloc' && step.failed.includes(o.name);
                                    const passed = step.opIndex !== null ? i < step.opIndex : step.phase === 'done';
                                    return (
                                        <span key={i} className={`px-2 py-1 rounded-md text-xs font-mono border transition-colors ${isCur
                                            ? 'bg-yellow-400 text-slate-900 border-yellow-300'
                                            : isFailed ? 'bg-red-500/15 text-red-300 border-red-500/50 line-through'
                                                : passed ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-900 text-slate-500 border-slate-800'}`}>
                                            {o.op === 'alloc' ? `${o.name}+${o.size}K` : `free ${o.name}`}
                                        </span>
                                    );
                                })}
                            </div>

                            <MemoryBar step={step} showOutcome={!predict.hideExplanation} />

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                                {[
                                    ['Free in total', `${step.free} KB`, 'text-slate-200'],
                                    ['Largest hole', `${step.largest} KB`, 'text-green-300'],
                                    ['Holes', step.holes.length, 'text-slate-200'],
                                    ['Fragmented', `${frag}%`, frag >= 40 ? 'text-red-300' : 'text-yellow-300'],
                                ].map(([label, v, tone]) => (
                                    <div key={label} className="p-3 bg-slate-800/60 rounded-lg border border-slate-700 text-center">
                                        <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">{label}</div>
                                        <div className={`text-xl font-bold font-mono ${tone}`}>{v}</div>
                                    </div>
                                ))}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-2">
                                &quot;Fragmented&quot; is the share of free memory outside the largest hole — memory that a single big request cannot use.
                            </p>

                            {step.phase === 'request' && (
                                <div className="mt-4 flex items-center gap-3 p-3 rounded-lg bg-slate-800/60 border border-yellow-500/30">
                                    <span className="text-xs uppercase tracking-wide text-slate-400">Request</span>
                                    <span className="px-3 py-1 rounded-md font-bold text-slate-900" style={{ background: COLORS[step.colorOf[step.request.name]] }}>
                                        {step.request.name} · {step.request.size} KB
                                    </span>
                                    <span className="text-xs text-slate-400 font-mono">holes: {step.holes.map(h => `${h.size}@${h.start}`).join('  ')}</span>
                                </div>
                            )}

                            {predict.prompt && (
                                <div className="mt-5">
                                    <PredictPrompt predict={predict} accent="yellow" />
                                </div>
                            )}

                            <div className={`mt-5 rounded-lg p-4 border ${step.phase === 'fail' && !predict.hideExplanation ? 'bg-red-500/10 border-red-500/30' : 'bg-yellow-500/10 border-yellow-500/20'}`}>
                                <div className="flex items-start gap-2">
                                    {step.phase === 'fail' ? <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" /> : <Info className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />}
                                    <p className={`${step.phase === 'fail' ? 'text-red-200' : 'text-yellow-200'} text-sm leading-relaxed`}>
                                        {predict.hideExplanation ? 'Make your prediction above to reveal this step.' : step.explanation}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Comparison */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-1">Same workload, every policy</h3>
                            <p className="text-xs text-slate-500 mb-4">End state without compaction, plus how many compactions each would need. Click a row to replay it.</p>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-slate-400 text-xs border-b border-slate-700">
                                            <th className="text-left py-2">Policy</th>
                                            <th className="py-2">Failed</th>
                                            <th className="py-2">Holes</th>
                                            <th className="py-2">Largest</th>
                                            <th className="py-2">Free</th>
                                            <th className="py-2">Compactions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {comparison.map(c => (
                                            <tr key={c.key} onClick={() => setPolicy(c.key)}
                                                className={`border-b border-slate-800 cursor-pointer transition-colors ${c.key === policy ? 'bg-yellow-500/10' : 'hover:bg-slate-800/50'}`}>
                                                <td className={`py-2 font-semibold ${c.key === policy ? 'text-yellow-300' : 'text-slate-200'}`}>{POLICIES[c.key].label}</td>
                                                <td className={`py-2 text-center font-mono ${c.failed.length ? 'text-red-300' : 'text-green-300'}`}>{c.failed.length ? c.failed.join(', ') : 'none'}</td>
                                                <td className="py-2 text-center font-mono text-slate-300">{c.holes}</td>
                                                <td className="py-2 text-center font-mono text-slate-300">{c.largest} KB</td>
                                                <td className="py-2 text-center font-mono text-slate-300">{c.free} KB</td>
                                                <td className="py-2 text-center font-mono text-slate-300">{c.compactions}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Clock className="h-5 w-5 text-yellow-500" />
                                <h3 className="font-bold text-white">Reading the Bar</h3>
                            </div>
                            <ul className="space-y-2.5 text-sm text-slate-300">
                                <li className="flex gap-2"><span className="w-4 h-4 mt-0.5 rounded-sm flex-shrink-0" style={{ background: 'repeating-linear-gradient(135deg, #0f172a, #0f172a 3px, #334155 3px, #334155 6px)' }} />Hatched space is a free hole.</li>
                                <li className="flex gap-2"><span className="flex items-center justify-center w-4 h-4 mt-0.5 rounded-sm bg-green-500/25 text-green-300 flex-shrink-0"><Check className="h-3 w-3" /></span>Numbered badges are the holes a policy examined, in order.</li>
                                <li className="flex gap-2"><span className="w-4 h-4 mt-0.5 rounded-sm border-2 border-yellow-300 flex-shrink-0" />The yellow outline is the hole it chose.</li>
                                <li className="flex gap-2"><span className="w-0 h-0 mt-1.5 border-x-[6px] border-x-transparent border-b-[8px] border-b-yellow-400 flex-shrink-0" />Next fit&apos;s roving pointer.</li>
                            </ul>
                            <div className="mt-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700/60 text-xs text-slate-400 leading-relaxed">
                                Simulations put first fit and best fit roughly level on memory use, with first fit faster because it stops early. Knuth&apos;s fifty-percent rule: in steady state there are about half as many holes as allocated blocks, so up to a third of memory can be unusable.
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

export default MemoryAllocationPage;
