"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Shuffle, Info, Code2, ScrollText, Clock, HardDrive, Cpu, Zap } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

const PAGES = ['P1', 'P2', 'P3'];
const INITIAL = { P1: 10, P2: 20, P3: 30 };

/* Workloads in shorthand: U1(P1=15) T1 sets page P1 to 15, F(P2) the buffer
   manager writes P2 to disk, C1 T1 commits, X the power fails. */
const parsePlan = (text) => text.split(' ').map(tok => {
    if (tok === 'X') return { kind: 'crash' };
    let m = /^U(\d)\((P\d)=(\d+)\)$/.exec(tok);
    if (m) return { kind: 'update', t: Number(m[1]), page: m[2], value: Number(m[3]) };
    m = /^F\((P\d)\)$/.exec(tok);
    if (m) return { kind: 'flush', page: m[1] };
    return { kind: 'commit', t: Number(tok.slice(1)) };
});

const PRESETS = [
    {
        id: 'steal', name: 'Steal and no-force',
        blurb: 'T1 commits but its page never reaches disk. T2 never commits but its page does. Recovery has to fix both.',
        plan: parsePlan('U1(P1=15) U2(P2=25) F(P2) C1 U2(P3=35) X'),
    },
    {
        id: 'commit', name: 'Crash right after commit',
        blurb: 'T1 commits two updates that are still only in memory; T2 has flushed its uncommitted change.',
        plan: parsePlan('U1(P1=15) U1(P2=25) C1 U2(P3=35) F(P3) X'),
    },
    {
        id: 'three', name: 'Three transactions',
        blurb: 'T2 and T3 commit, T1 does not. Some pages were flushed, some were not, and one log record never left memory.',
        plan: parsePlan('U1(P1=15) U2(P2=25) U3(P3=35) C2 F(P1) U3(P2=28) F(P2) C3 U1(P3=40) X'),
    },
];

/** A random workload that respects locking: nobody updates a page whose last
    writer is still running, unless it is that writer. Always ends in a crash. */
function randomPlan(rand = Math.random) {
    const plan = [];
    const owner = {};
    const status = {};
    const n = 6 + Math.floor(rand() * 5);
    for (let k = 0; k < n; k++) {
        const x = rand();
        const active = Object.keys(status).filter(t => status[t] === 'active').map(Number);
        if (x < 0.55) {
            const t = 1 + Math.floor(rand() * 3);
            if (status[t] === 'committed') continue;
            const free = PAGES.filter(p => owner[p] === undefined || owner[p] === t || status[owner[p]] === 'committed');
            if (!free.length) continue;
            const page = free[Math.floor(rand() * free.length)];
            status[t] = 'active';
            owner[page] = t;
            plan.push({ kind: 'update', t, page, value: 10 + Math.floor(rand() * 80) });
        } else if (x < 0.8) {
            plan.push({ kind: 'flush', page: PAGES[Math.floor(rand() * PAGES.length)] });
        } else if (active.length) {
            const t = active[Math.floor(rand() * active.length)];
            status[t] = 'committed';
            plan.push({ kind: 'commit', t });
        }
    }
    plan.push({ kind: 'crash' });
    return plan;
}

const recText = (r) => {
    if (r.type === 'UPDATE') return `${r.page}: ${r.before} → ${r.after}`;
    if (r.type === 'CLR') return `${r.page} := ${r.after} (undoes ${r.undoes})`;
    return r.type;
};

function generateSteps(plan, blurb = '') {
    const disk = Object.fromEntries(PAGES.map(p => [p, { value: INITIAL[p], lsn: 0 }]));
    let buffer = Object.fromEntries(PAGES.map(p => [p, { value: INITIAL[p], lsn: 0, dirty: false }]));
    let log = [];
    let flushed = 0;
    let nextLSN = 1;
    const txns = {};
    const roles = {};
    const steps = [];
    let phase = 'normal';

    const snap = () => ({
        phase,
        buffer: buffer ? PAGES.map(p => ({ page: p, ...buffer[p] })) : null,
        disk: PAGES.map(p => ({ page: p, ...disk[p] })),
        log: log.map(r => ({ ...r, onDisk: r.lsn <= flushed })),
        flushedLSN: flushed,
        txns: Object.keys(txns).map(Number).sort((a, b) => a - b).map(t => ({ t, status: txns[t], role: roles[t] ?? null })),
    });
    const push = (kind, explanation, extra = {}) => steps.push({ kind, explanation, focus: {}, lost: [], ...snap(), ...extra });
    const forceTo = (lsn) => { flushed = Math.max(flushed, lsn); };

    push('intro', `${blurb} Every change is described in the log before it may reach the data pages on disk. Pages: ${PAGES.map(p => `${p} = ${INITIAL[p]}`).join(', ')}.`.trim());

    for (const op of plan) {
        if (op.kind === 'update') {
            if (!txns[op.t]) txns[op.t] = 'active';
            const rec = { lsn: nextLSN++, t: op.t, type: 'UPDATE', page: op.page, before: buffer[op.page].value, after: op.value };
            log.push(rec);
            buffer[op.page] = { value: op.value, lsn: rec.lsn, dirty: true };
            push('update', `T${op.t} sets ${op.page} from ${rec.before} to ${op.value}. First the log record LSN ${rec.lsn} (before ${rec.before}, after ${op.value}) is appended to the log buffer in memory; then the page in the buffer pool changes and is stamped pageLSN ${rec.lsn}. Nothing has touched the disk.`, { focus: { lsn: rec.lsn, page: op.page } });
        } else if (op.kind === 'flush') {
            const b = buffer[op.page];
            if (!b.dirty) {
                push('noop-flush', `The buffer manager looks at ${op.page}, but it is clean — the disk already has this version. Nothing to write.`, { focus: { page: op.page } });
                continue;
            }
            if (b.lsn > flushed) {
                const from = flushed + 1;
                forceTo(b.lsn);
                push('force', `The buffer manager wants to write ${op.page} (pageLSN ${b.lsn}), but the log on disk only reaches LSN ${from - 1}. The write-ahead rule says the log describing a change must be on disk before the change is, so the log is forced first: LSN ${from}${b.lsn > from ? `–${b.lsn}` : ''} go to disk.`, { focus: { page: op.page, lsn: b.lsn } });
            }
            const writer = [...log].reverse().find(r => r.type === 'UPDATE' && r.page === op.page);
            const steal = writer && txns[writer.t] === 'active';
            disk[op.page] = { value: b.value, lsn: b.lsn };
            b.dirty = false;
            push('write', `${op.page} = ${b.value} is written to disk with pageLSN ${b.lsn}.${steal ? ` T${writer.t} has not committed — writing its change anyway is called steal. It is safe only because LSN ${writer.lsn} is on disk to undo it.` : ' Its last writer has committed, so this just saves recovery some work.'}`, { focus: { page: op.page }, flushOf: op.page });
        } else if (op.kind === 'commit') {
            if (!txns[op.t]) txns[op.t] = 'active';
            const rec = { lsn: nextLSN++, t: op.t, type: 'COMMIT' };
            log.push(rec);
            forceTo(rec.lsn);
            txns[op.t] = 'committed';
            const inMemory = PAGES.filter(p => buffer[p].dirty && log.some(r => r.type === 'UPDATE' && r.t === op.t && r.page === p));
            push('commit', `T${op.t} commits: COMMIT record LSN ${rec.lsn} is appended and the log is forced to disk through LSN ${rec.lsn}. Only now is the commit acknowledged.${inMemory.length ? ` ${inMemory.join(', ')} still ${inMemory.length > 1 ? 'exist' : 'exists'} only in memory — data pages are not forced at commit (no-force), because the log can rebuild them.` : ''}`, { focus: { lsn: rec.lsn } });
        } else {
            const lost = log.filter(r => r.lsn > flushed);
            phase = 'crash';
            log = log.filter(r => r.lsn <= flushed);
            buffer = null;
            push('crash', `Power failure. Memory is gone: the buffer pool and ${lost.length ? `the log tail that never reached disk (LSN ${lost.map(r => r.lsn).join(', ')})` : 'the (empty) log buffer'}. What survives is the disk: ${PAGES.map(p => `${p} = ${disk[p].value}`).join(', ')}, and the log through LSN ${flushed}.`, { lost });
            break;
        }
    }
    if (phase !== 'crash') return steps;

    /* ── Recovery ── */
    phase = 'analysis';
    const winners = [...new Set(log.filter(r => r.type === 'COMMIT').map(r => r.t))].sort((a, b) => a - b);
    const losers = [...new Set(log.filter(r => r.type === 'UPDATE' && !winners.includes(r.t)).map(r => r.t))].sort((a, b) => a - b);
    const ghosts = Object.keys(txns).map(Number).filter(t => !winners.includes(t) && !losers.includes(t));
    winners.forEach(t => { roles[t] = 'winner'; });
    losers.forEach(t => { roles[t] = 'loser'; });
    ghosts.forEach(t => { roles[t] = 'unseen'; });
    push('analysis', `Analysis: scan the log on disk. ${winners.length ? `${winners.map(t => `T${t}`).join(', ')} ${winners.length > 1 ? 'have' : 'has a'} COMMIT record${winners.length > 1 ? 's' : ''} — winners, whose work must survive.` : 'Nobody committed.'} ${losers.length ? `${losers.map(t => `T${t}`).join(', ')} wrote updates but never committed — losers, whose work must vanish.` : 'There are no losers.'}${ghosts.length ? ` ${ghosts.map(t => `T${t}`).join(', ')} left no record on disk at all, so to recovery it never ran.` : ''}`);

    phase = 'redo';
    buffer = Object.fromEntries(PAGES.map(p => [p, { value: disk[p].value, lsn: disk[p].lsn, dirty: false }]));
    nextLSN = (log.length ? log[log.length - 1].lsn : 0) + 1;
    push('redo-start', 'Redo: read the pages back from disk and walk the log forward from the start, repeating history — losers included — so memory ends up exactly as it was at the crash. A record is reapplied only if its LSN is newer than the page’s pageLSN.');
    for (const rec of log.filter(r => r.type === 'UPDATE')) {
        const page = buffer[rec.page];
        const before = page.lsn;
        const apply = rec.lsn > page.lsn;
        if (apply) { page.value = rec.after; page.lsn = rec.lsn; page.dirty = true; }
        push('redo', apply
            ? `LSN ${rec.lsn}: ${rec.page} has pageLSN ${before} < ${rec.lsn}, so this change never reached disk. Redo it: ${rec.page} = ${rec.after}, pageLSN ${rec.lsn}.`
            : `LSN ${rec.lsn}: ${rec.page} already has pageLSN ${before} ≥ ${rec.lsn}, so the disk copy already contains this change. Skip it.`,
        { focus: { lsn: rec.lsn, page: rec.page }, decision: apply ? 'redo' : 'skip', pageLSNBefore: before });
    }

    phase = 'undo';
    const toUndo = log.filter(r => r.type === 'UPDATE' && losers.includes(r.t)).sort((a, b) => b.lsn - a.lsn);
    if (!toUndo.length) push('undo-none', 'Undo: there are no losers, so there is nothing to roll back.');
    for (const rec of toUndo) {
        const clr = { lsn: nextLSN++, t: rec.t, type: 'CLR', page: rec.page, after: rec.before, undoes: rec.lsn };
        log.push(clr);
        buffer[rec.page] = { value: rec.before, lsn: clr.lsn, dirty: true };
        push('undo', `Undo, newest first: LSN ${rec.lsn} belongs to loser T${rec.t}, so ${rec.page} goes back to its before-image ${rec.before}. The undo is itself logged as compensation record LSN ${clr.lsn}, so a crash during recovery never undoes the same change twice.`,
            { focus: { lsn: rec.lsn, page: rec.page, clr: clr.lsn }, undone: rec.lsn });
    }
    for (const t of losers) {
        log.push({ lsn: nextLSN++, t, type: 'END' });
        txns[t] = 'aborted';
    }
    if (losers.length) push('end', `${losers.map(t => `T${t}`).join(', ')} ${losers.length > 1 ? 'are' : 'is'} fully rolled back: an END record closes ${losers.length > 1 ? 'each' : 'it'}.`);

    phase = 'done';
    forceTo(log.length ? log[log.length - 1].lsn : 0);
    PAGES.forEach(p => { disk[p] = { value: buffer[p].value, lsn: buffer[p].lsn }; buffer[p].dirty = false; });
    push('final', `Recovery complete and flushed: ${PAGES.map(p => `${p} = ${buffer[p].value}`).join(', ')}. ${winners.length ? `Every committed change survived (${winners.map(t => `T${t}`).join(', ')})` : 'Nothing had committed'}${losers.length ? `, and every trace of ${losers.map(t => `T${t}`).join(', ')} is gone` : ''}. The database is back to a state that only ever contained committed transactions.`);
    return steps;
}

/* Three decisions the screen settles: whether a page write must wait for the
   log, whether redo reapplies a record, and which record undo takes next. */
const predictFor = (step, next) => {
    if (!step || !next) return null;
    if (next.kind === 'force' || (next.kind === 'write' && step.kind !== 'force')) {
        const page = next.focus.page;
        const b = step.buffer.find(x => x.page === page);
        const options = ['Write the page now', 'Force the log first'];
        return {
            question: `The buffer manager wants to write ${page} (pageLSN ${b.lsn}) to disk. The log on disk reaches LSN ${step.flushedLSN}. What happens first?`,
            options,
            correct: next.kind === 'force' ? 1 : 0,
            because: next.kind === 'force'
                ? `LSN ${b.lsn} is not on disk yet. If the page went first and the power failed, nothing on disk would describe its change.`
                : `The log on disk already covers LSN ${b.lsn}, so the write-ahead rule is satisfied.`,
        };
    }
    if (next.kind === 'redo') {
        const rec = step.log.find(r => r.lsn === next.focus.lsn);
        const page = step.buffer.find(x => x.page === rec.page);
        return {
            question: `Redo reaches LSN ${rec.lsn} (${rec.page}: ${rec.before} → ${rec.after}). ${rec.page} has pageLSN ${page.lsn}. Redo it?`,
            options: ['Redo it', 'Skip it'],
            correct: next.decision === 'redo' ? 0 : 1,
            because: next.decision === 'redo'
                ? `${rec.lsn} > ${page.lsn}: the page has not seen this change.`
                : `${page.lsn} ≥ ${rec.lsn}: the page was written to disk after this change, so it already contains it.`,
        };
    }
    if (next.kind === 'undo') {
        const losers = step.txns.filter(x => x.role === 'loser').map(x => x.t);
        const undone = new Set(step.log.filter(r => r.type === 'CLR').map(r => r.undoes));
        const left = step.log.filter(r => r.type === 'UPDATE' && losers.includes(r.t) && !undone.has(r.lsn));
        if (left.length < 2) return null;
        // Undo always takes the newest, so listing by LSN would put the answer
        // in the same place every time. Rotate by how long the log is.
        const shift = step.log.length % left.length;
        const order = [...left.slice(shift), ...left.slice(0, shift)];
        return {
            question: 'Which loser record does undo roll back next?',
            options: order.map(r => `LSN ${r.lsn} (T${r.t}, ${r.page})`),
            correct: order.findIndex(r => r.lsn === next.undone),
            because: `Undo walks the log backwards, so the newest loser change — LSN ${next.undone} — goes first; older changes to the same page are undone after it.`,
        };
    }
    return null;
};

const quizQuestions = [
    {
        question: 'What exactly does the write-ahead rule require?',
        options: [
            'Data pages are written before the log',
            'A page may reach disk only after the log records describing its changes are on disk',
            'Every update is written to disk immediately',
            'The log is written once per checkpoint',
        ],
        correct: 1,
        explanation: 'If a page could reach disk first and the system crashed, the disk would hold a change with no record of how to undo it. Forcing the log up to the page’s pageLSN before the write rules that out.',
    },
    {
        question: 'Why does recovery redo the updates of losers too, only to undo them afterwards?',
        options: [
            'It is a bug in ARIES',
            'Repeating history restores memory exactly as it was at the crash, so undo can roll losers back with simple logged steps',
            'Losers might have committed after all',
            'Redo is cheaper than checking',
        ],
        correct: 1,
        explanation: 'Repeating history makes redo trivial (no need to know who won) and gives undo a known starting state. Each undo then writes a compensation log record, so recovery itself survives a crash.',
    },
    {
        question: 'A transaction commits under a steal / no-force policy. What has to be on disk when COMMIT returns?',
        options: ['All of its data pages', 'Its log records up to and including COMMIT', 'Nothing', 'The whole buffer pool'],
        correct: 1,
        explanation: 'No-force means data pages can stay in memory; the forced log is enough to redo them after a crash. That turns a commit into one sequential log write instead of many random page writes.',
    },
];

const TXN = {
    1: { text: 'text-blue-300', border: 'border-blue-400/60' },
    2: { text: 'text-orange-300', border: 'border-orange-400/60' },
    3: { text: 'text-violet-300', border: 'border-violet-400/60' },
};

function PageCard({ p, focus, label }) {
    return (
        <div className={`rounded-lg border-2 p-2 text-center transition-all duration-500 ${focus ? 'border-yellow-400 bg-yellow-400/10 scale-105' : p.dirty ? 'border-amber-500/70 bg-amber-500/10' : 'border-slate-600 bg-slate-800'}`}>
            <div className="text-[10px] uppercase tracking-wide text-slate-500">{label ?? p.page}</div>
            <div className="text-2xl font-bold text-slate-100 leading-tight">{p.value}</div>
            <div className="font-mono text-[10px] text-slate-400">pageLSN {p.lsn}</div>
            {p.dirty && <div className="text-[10px] text-amber-300 font-semibold">dirty</div>}
        </div>
    );
}

function LogRow({ r, focus, lost, clr }) {
    const tone = lost ? 'border-red-500/60 bg-red-500/10 text-red-300 line-through'
        : focus ? 'border-yellow-400 bg-yellow-400/15 text-yellow-100'
            : clr ? 'border-teal-400/70 bg-teal-500/10 text-teal-200'
                : r.type === 'COMMIT' ? 'border-green-500/50 bg-green-500/10 text-green-300'
                    : r.type === 'CLR' || r.type === 'END' ? 'border-teal-500/40 text-teal-300'
                        : 'border-slate-700 text-slate-300';
    return (
        <div className={`flex items-center gap-2 px-2 py-1 rounded border font-mono text-[11px] transition-colors duration-300 ${tone}`}>
            <span className="text-slate-500 w-10 flex-shrink-0">LSN {r.lsn}</span>
            <span className={`w-6 flex-shrink-0 font-bold ${TXN[r.t]?.text ?? ''}`}>T{r.t}</span>
            <span className="truncate">{recText(r)}</span>
        </div>
    );
}

const STAGES = [
    { id: 'normal', label: 'Normal' },
    { id: 'crash', label: 'Crash' },
    { id: 'analysis', label: 'Analysis' },
    { id: 'redo', label: 'Redo' },
    { id: 'undo', label: 'Undo' },
    { id: 'done', label: 'Done' },
];

function WriteAheadLoggingPage() {
    const [presetId, setPresetId] = useState('steal');
    const [plan, setPlan] = useState(PRESETS[0].plan);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1300);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    useEffect(() => {
        const preset = PRESETS.find(p => p.id === presetId);
        setStepHistory(generateSteps(plan, preset ? preset.blurb : 'A random workload ends in a crash.'));
        setCurrentStep(0);
    }, [plan, presetId]);

    useEffect(() => {
        if (!isPlaying || stepHistory.length === 0) return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const pauseForPredict = useCallback(() => setIsPlaying(false), []);
    const predict = usePredict(stepHistory, currentStep, predictFor, pauseForPredict);
    // usePredict keys answers by step index, so a new run (another preset,
    // level or shuffle) must start with none recorded.
    const resetPredict = predict.reset;
    useEffect(() => { resetPredict(); }, [stepHistory, resetPredict]);

    const choosePreset = (p) => { setIsPlaying(false); setPresetId(p.id); setPlan(p.plan); };
    const shuffle = () => { setIsPlaying(false); setPresetId(null); setPlan(randomPlan()); };
    const reset = () => { setIsPlaying(false); setCurrentStep(0); };

    const step = stepHistory[currentStep];
    const stageIdx = step ? STAGES.findIndex(s => s.id === step.phase) : 0;
    const crashed = step && step.phase !== 'normal';

    const handleQuizAnswer = (idx) => {
        if (quizState.answered) return;
        const correct = idx === quizQuestions[quizState.current].correct;
        setQuizState(s => ({ ...s, selected: idx, answered: true, score: correct ? s.score + 1 : s.score }));
    };
    const nextQuestion = () => {
        if (quizState.current + 1 >= quizQuestions.length) setQuizState(s => ({ ...s, complete: true }));
        else setQuizState(s => ({ ...s, current: s.current + 1, selected: null, answered: false }));
    };

    const codeExample = `def recover(log, disk):
    """ARIES in miniature. log: records on disk, in LSN order."""
    # 1. Analysis: who committed?
    winners = {r.txn for r in log if r.type == 'COMMIT'}
    losers  = {r.txn for r in log if r.type == 'UPDATE'} - winners

    # 2. Redo: repeat history, losers included
    pages = {p: disk.read(p) for p in disk.pages}
    for r in log:
        if r.type in ('UPDATE', 'CLR'):
            page = pages[r.page]
            if r.lsn > page.lsn:                # not on disk yet
                page.value, page.lsn = r.after, r.lsn

    # 3. Undo: roll losers back, newest first, logging each step
    for r in sorted((r for r in log if r.type == 'UPDATE'
                     and r.txn in losers), key=lambda r: -r.lsn):
        clr = log.append(type='CLR', txn=r.txn, page=r.page,
                         after=r.before, undoes=r.lsn)
        pages[r.page].value, pages[r.page].lsn = r.before, clr.lsn
    for t in losers:
        log.append(type='END', txn=t)
    return pages`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-blue-500 to-teal-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex items-center mb-6">
                        <Link href="/database-systems" className="flex items-center text-white hover:text-blue-200 transition-colors mr-4">
                            <ArrowLeft className="h-5 w-5 mr-2" />Back to Database Systems
                        </Link>
                    </div>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4 flex items-center justify-center gap-3">
                            <ScrollText className="h-10 w-10" />Write-Ahead Logging
                        </h1>
                        <p className="text-xl text-blue-100 mb-6 max-w-3xl mx-auto">
                            Describe every change in a log before making it, force the log at commit, and a crash can never lose a committed transaction or keep an uncommitted one.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Log before data</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Steal / no-force</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Redo then undo</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6 mb-6">
                            <div className="flex flex-wrap items-center gap-2 mb-5">
                                <span className="text-xs uppercase tracking-wide text-slate-500 mr-1">Workload</span>
                                {PRESETS.map(p => (
                                    <button key={p.id} onClick={() => choosePreset(p)}
                                        className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${p.id === presetId ? 'bg-blue-500/20 border-blue-400 text-blue-200' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                                        {p.name}
                                    </button>
                                ))}
                            </div>

                            <div className="flex flex-wrap gap-3 mb-5">
                                <button onClick={() => setIsPlaying(p => !p)} disabled={currentStep >= stepHistory.length - 1 && !isPlaying}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50">
                                    {isPlaying ? <Pause size={18} /> : <Play size={18} />}{isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={() => setCurrentStep(s => Math.max(0, s - 1))} disabled={isPlaying || currentStep === 0}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium disabled:opacity-50">
                                    <SkipBack size={18} />Step Back
                                </button>
                                <button onClick={() => setCurrentStep(s => Math.min(stepHistory.length - 1, s + 1))} disabled={isPlaying || currentStep >= stepHistory.length - 1}
                                    className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:opacity-50">
                                    <SkipForward size={18} />Step Forward
                                </button>
                                <button onClick={reset} className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium">
                                    <RotateCcw size={18} />Reset
                                </button>
                                <button onClick={shuffle} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium">
                                    <Shuffle size={18} />Random Workload
                                </button>
                                <PredictToggle predict={predict} accent="blue" />
                            </div>

                            <div className="mb-5">
                                <label className="block text-sm font-medium mb-2 text-slate-300">Animation Speed: {speed}ms</label>
                                <input type="range" min="200" max="2000" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-full max-w-md accent-blue-500" />
                            </div>

                            <div className="mb-5">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-slate-300">Step {currentStep + 1} of {stepHistory.length}</span>
                                    <div className="flex gap-1">
                                        {STAGES.map((s, k) => (
                                            <span key={s.id} className={`text-[10px] px-2 py-0.5 rounded border ${k === stageIdx ? (s.id === 'crash' ? 'bg-red-500/20 border-red-400 text-red-200' : 'bg-blue-500/20 border-blue-400 text-blue-200') : k < stageIdx ? 'border-slate-700 text-slate-400' : 'border-transparent text-slate-600'}`}>{s.label}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-2">
                                    <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: `${((currentStep + 1) / Math.max(stepHistory.length, 1)) * 100}%` }} />
                                </div>
                            </div>

                            {step && (
                                <div className="space-y-3 mb-5">
                                    <div className="flex flex-wrap gap-2">
                                        {step.txns.map(tx => (
                                            <span key={tx.t} className={`text-xs px-2 py-1 rounded border ${TXN[tx.t].border} ${TXN[tx.t].text}`}>
                                                T{tx.t}: {tx.role ? `${tx.role}${tx.status === 'aborted' ? ', rolled back' : ''}` : tx.status}
                                            </span>
                                        ))}
                                        {step.txns.length === 0 && <span className="text-xs text-slate-600">no transactions yet</span>}
                                    </div>

                                    {/* Memory */}
                                    <div className={`rounded-lg border p-3 transition-colors duration-500 ${step.kind === 'crash' ? 'border-red-500 bg-red-500/10' : 'border-slate-700/60 bg-slate-800/50'}`}>
                                        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500 mb-2">
                                            <Cpu className="h-3.5 w-3.5" />Memory — lost on a crash
                                            {step.kind === 'crash' && <span className="flex items-center gap-1 text-red-300 normal-case tracking-normal font-semibold"><Zap className="h-3.5 w-3.5" />power failure</span>}
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <div className="text-[11px] text-slate-400 mb-1">Buffer pool</div>
                                                {step.buffer
                                                    ? <div className="grid grid-cols-3 gap-2">{step.buffer.map(p => <PageCard key={p.page} p={p} focus={step.focus.page === p.page && step.phase !== 'crash'} />)}</div>
                                                    : <div className="h-20 rounded-lg border border-dashed border-red-500/50 flex items-center justify-center text-xs text-red-300/80">{crashed && step.phase === 'crash' ? 'wiped' : 'empty'}</div>}
                                            </div>
                                            <div>
                                                <div className="text-[11px] text-slate-400 mb-1">Log buffer (not yet on disk)</div>
                                                <div className="space-y-1">
                                                    {step.lost.map(r => <LogRow key={`lost${r.lsn}`} r={r} lost />)}
                                                    {step.log.filter(r => !r.onDisk).map(r => <LogRow key={r.lsn} r={r} focus={step.focus.lsn === r.lsn} clr={step.focus.clr === r.lsn} />)}
                                                    {step.lost.length === 0 && step.log.every(r => r.onDisk) && <div className="text-[11px] text-slate-600">empty</div>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                        <div className="flex-1 border-t border-dashed border-slate-600" />write-ahead rule: log first, then pages<div className="flex-1 border-t border-dashed border-slate-600" />
                                    </div>

                                    {/* Disk */}
                                    <div className="rounded-lg border border-slate-700/60 bg-slate-800/50 p-3">
                                        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500 mb-2">
                                            <HardDrive className="h-3.5 w-3.5" />Disk — survives
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <div className="text-[11px] text-slate-400 mb-1">Data pages</div>
                                                <div className="grid grid-cols-3 gap-2">{step.disk.map(p => <PageCard key={p.page} p={p} focus={step.flushOf === p.page} />)}</div>
                                            </div>
                                            <div>
                                                <div className="text-[11px] text-slate-400 mb-1">Log on disk · flushed through LSN {step.flushedLSN}</div>
                                                <div className="space-y-1 max-h-64 overflow-y-auto">
                                                    {step.log.filter(r => r.onDisk).map(r => <LogRow key={r.lsn} r={r} focus={step.focus.lsn === r.lsn} clr={step.focus.clr === r.lsn} />)}
                                                    {step.log.every(r => !r.onDisk) && <div className="text-[11px] text-slate-600">empty</div>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {predict.prompt && (
                                <div className="mb-4">
                                    <PredictPrompt predict={predict} accent="blue" />
                                </div>
                            )}

                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                                <div className="flex items-start gap-2">
                                    <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-blue-200 text-sm leading-relaxed">
                                        {predict.hideExplanation ? 'Make your prediction above to reveal this step.' : step?.explanation ?? 'Click Play to begin.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Clock className="h-5 w-5 text-blue-400" />
                                <h3 className="font-bold text-white">Two Rules, Two Policies</h3>
                            </div>
                            <div className="space-y-3 text-sm">
                                {[
                                    ['Write-ahead', 'A page reaches disk only after the log through its pageLSN does.', ['force', 'write']],
                                    ['Force at commit', 'COMMIT returns only once its log record is on disk.', ['commit']],
                                    ['Steal', 'Dirty pages of running transactions may be written — so recovery needs undo.', ['write']],
                                    ['No-force', 'Committed pages need not be written at commit — so recovery needs redo.', ['commit', 'redo']],
                                ].map(([title, body, kinds]) => {
                                    const on = step && kinds.includes(step.kind);
                                    return (
                                        <div key={title} className={`rounded-lg p-2 border transition-colors ${on ? 'border-blue-400/60 bg-blue-500/10' : 'border-transparent'}`}>
                                            <div className={`font-semibold ${on ? 'text-blue-200' : 'text-slate-200'}`}>{title}</div>
                                            <div className="text-xs text-slate-400 leading-relaxed">{body}</div>
                                        </div>
                                    );
                                })}
                            </div>
                            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                                Real systems also write checkpoints, so analysis and redo start from a recent point instead of the beginning of the log.
                            </p>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">Knowledge Check</h3>
                            {quizState.complete ? (
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-white mb-2">{quizState.score}/{quizQuestions.length}</p>
                                    <p className="text-slate-400 mb-4">{quizState.score === quizQuestions.length ? 'Perfect score!' : 'Keep practicing!'}</p>
                                    <button onClick={() => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false })} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium">Try Again</button>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-xs text-slate-500 mb-2">Question {quizState.current + 1} of {quizQuestions.length}</p>
                                    <p className="text-sm font-medium text-slate-200 mb-3">{quizQuestions[quizState.current].question}</p>
                                    <div className="space-y-2">
                                        {quizQuestions[quizState.current].options.map((option, i) => {
                                            let cls = 'w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors ';
                                            if (!quizState.answered) cls += 'border-slate-600 text-slate-300 hover:border-blue-500 hover:text-white bg-slate-800/50';
                                            else if (i === quizQuestions[quizState.current].correct) cls += 'border-green-500 bg-green-500/10 text-green-300';
                                            else if (i === quizState.selected) cls += 'border-red-500 bg-red-500/10 text-red-300';
                                            else cls += 'border-slate-700 text-slate-500 bg-slate-800/30';
                                            return <button key={i} onClick={() => handleQuizAnswer(i)} className={cls}>{option}</button>;
                                        })}
                                    </div>
                                    {quizState.answered && (
                                        <div className="mt-3">
                                            <p className="text-xs text-slate-400 mb-3">{quizQuestions[quizState.current].explanation}</p>
                                            <button onClick={nextQuestion} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium">
                                                {quizState.current < quizQuestions.length - 1 ? 'Next Question' : 'See Results'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <button onClick={() => setShowCode(c => !c)} className="flex items-center gap-2 text-blue-400 hover:text-blue-300 font-medium">
                                <Code2 className="h-5 w-5" />{showCode ? 'Hide' : 'Show'} Python Code
                            </button>
                            {showCode && <div className="mt-4"><CodeBlock code={codeExample} language="python" /></div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default WriteAheadLoggingPage;
