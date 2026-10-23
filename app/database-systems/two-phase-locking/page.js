"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Shuffle, Info, Code2, Lock, Clock, CheckCircle, XCircle } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* Schedules in textbook shorthand: S1(A) = T1 asks for a shared lock on A,
   X1(A) exclusive, R/W read and write, U1(A) unlock, C1 commit, A1 abort. */
const KIND_OF = { S: 'lock', X: 'lock', R: 'read', W: 'write', U: 'unlock', C: 'commit', A: 'abort' };
const parsePlan = (text) => text.split(' ').map(tok => {
    const m = /^([SXRWUCA])(\d)(?:\((\w)\))?$/.exec(tok);
    const kind = KIND_OF[m[1]];
    return { t: Number(m[2]), kind, item: m[3] ?? null, mode: kind === 'lock' ? m[1] : null };
});

const PRESETS = [
    {
        id: 'phases', name: 'Growing and shrinking',
        blurb: 'Two transactions share A, then each takes a lock of its own. Watch each lock count climb, peak and fall.',
        plan: parsePlan('S1(A) S2(A) R1(A) R2(A) X1(B) W1(B) X2(C) U1(A) W2(C) U1(B) C1 U2(A) U2(C) C2'),
    },
    {
        id: 'queue', name: 'Readers share, writer waits',
        blurb: 'T1 and T2 both read A under shared locks. T3 wants to write A and has to wait for both.',
        plan: parsePlan('S1(A) S2(A) R1(A) X3(A) R2(A) U1(A) C1 U2(A) C2 W3(A) U3(A) C3'),
    },
    {
        id: 'deadlock', name: 'Deadlock',
        blurb: 'T1 locks A and T2 locks B; then each asks for the other one.',
        plan: parsePlan('X1(A) X2(B) W1(A) W2(B) X1(B) X2(A) W1(B) U1(A) U1(B) C1 W2(A) U2(B) U2(A) C2'),
    },
    {
        id: 'cascade', name: 'Cascading abort',
        blurb: 'T1 writes A and unlocks it early. T2 reads A. Then T1 aborts.',
        plan: parsePlan('X1(A) W1(A) U1(A) S2(A) R2(A) U2(A) A1 C2'),
    },
];

const opLabel = (op) => {
    if (op.kind === 'lock') return `${op.mode}(${op.item})`;
    if (op.kind === 'read') return `R(${op.item})`;
    if (op.kind === 'write') return `W(${op.item})`;
    if (op.kind === 'unlock') return `U(${op.item})`;
    return op.kind === 'commit' ? 'COMMIT' : 'ABORT';
};
const modeName = (m) => (m === 'S' ? 'a shared' : 'an exclusive');

/** Random interleaving that keeps each transaction's own order. */
function interleave(plan, rand = Math.random) {
    const ids = [...new Set(plan.map(o => o.t))];
    const scripts = ids.map(t => plan.filter(o => o.t === t));
    const idx = ids.map(() => 0);
    const out = [];
    while (out.length < plan.length) {
        const live = ids.map((_, k) => k).filter(k => idx[k] < scripts[k].length);
        const k = live[Math.floor(rand() * live.length)];
        out.push(scripts[k][idx[k]++]);
    }
    return out;
}

function generateSteps(plan, mode, blurb = '') {
    const strict = mode === 'strict';
    const ids = [...new Set(plan.map(o => o.t))].sort((a, b) => a - b);
    const itemNames = [...new Set(plan.filter(o => o.item).map(o => o.item))].sort();
    const items = Object.fromEntries(itemNames.map(i => [i, { granted: [], queue: [], dirtyBy: null }]));
    const txns = Object.fromEntries(ids.map(t => [t, { status: 'active', phase: 'growing', held: {}, wait: null, deferred: [], readsFrom: [] }]));
    let queue = plan.map(o => ({ ...o }));
    const timeline = [];
    const counts = [Object.fromEntries(ids.map(t => [t, 0]))];
    const steps = [];

    const others = (item, t) => items[item].granted.filter(g => g.t !== t);
    const compatible = (item, t, m) => (m === 'S' ? others(item, t).every(g => g.mode === 'S') : others(item, t).length === 0);
    const blockersOf = (item, t, m, ahead) => [...new Set([
        ...others(item, t).filter(g => m === 'X' || g.mode === 'X').map(g => g.t),
        ...ahead.map(w => w.t),
    ])];
    const waitsFor = () => {
        const edges = [];
        for (const t of ids) {
            const tx = txns[t];
            if (tx.status !== 'waiting') continue;
            const q = items[tx.wait.item].queue;
            const pos = q.findIndex(w => w.t === t);
            for (const b of blockersOf(tx.wait.item, t, tx.wait.mode, q.slice(0, pos))) edges.push({ from: t, to: b });
        }
        return edges;
    };
    const cycleThrough = (t) => {
        const edges = waitsFor();
        const seen = new Set();
        const stack = edges.filter(e => e.from === t).map(e => e.to);
        while (stack.length) {
            const u = stack.pop();
            if (u === t) return true;
            if (seen.has(u)) continue;
            seen.add(u);
            stack.push(...edges.filter(e => e.from === u).map(e => e.to));
        }
        return false;
    };
    const grant = (item, t, m) => {
        const it = items[item];
        const mine = it.granted.find(g => g.t === t);
        if (mine) mine.mode = 'X';
        else it.granted.push({ t, mode: m });
        txns[t].held[item] = mine ? 'X' : m;
    };
    const drainQueue = (item) => {
        const woken = [];
        const it = items[item];
        while (it.queue.length) {
            const w = it.queue[0];
            if (!compatible(item, w.t, w.mode)) break;
            it.queue.shift();
            grant(item, w.t, w.mode);
            txns[w.t].status = 'active';
            txns[w.t].wait = null;
            woken.push({ ...w, item });
        }
        return woken;
    };
    const release = (item, t) => {
        items[item].granted = items[item].granted.filter(g => g.t !== t);
        delete txns[t].held[item];
    };

    const snap = () => ({
        items: itemNames.map(name => ({ name, granted: items[name].granted.map(g => ({ ...g })), queue: items[name].queue.map(w => ({ ...w })), dirtyBy: items[name].dirtyBy })),
        txns: ids.map(t => ({ t, status: txns[t].status, phase: txns[t].phase, held: { ...txns[t].held }, deferred: [...txns[t].deferred], waitItem: txns[t].wait ? txns[t].wait.item : null })),
        waits: waitsFor(),
        timeline: timeline.map(e => ({ ...e })),
        counts: counts.map(c => ({ ...c })),
        remaining: queue.map(op => ({ t: op.t, label: opLabel(op) })),
    });
    const record = (e) => {
        timeline.push({ ...e, waiting: ids.filter(t => txns[t].status === 'waiting') });
        counts.push(Object.fromEntries(ids.map(t => [t, Object.keys(txns[t].held).length])));
    };
    const push = (explanation, extra = {}) => steps.push({ mode, ids, event: timeline[timeline.length - 1] ?? null, explanation, ...snap(), ...extra });
    const lockWord = (n) => `${n} lock${n === 1 ? '' : 's'}`;

    const wakeAll = (woken) => {
        for (const w of woken) {
            record({ t: w.t, kind: 'lock', label: `${w.mode}(${w.item})`, item: w.item, mode: w.mode, resumed: true });
            push(`${w.item} is free for T${w.t} now: its ${w.mode === 'S' ? 'shared' : 'exclusive'} lock request is granted at last, and T${w.t} carries on with ${lockWord(Object.keys(txns[w.t].held).length)}.`);
        }
    };

    const abortTxn = (t, kind, why) => {
        const tx = txns[t];
        for (const name of itemNames) items[name].queue = items[name].queue.filter(w => w.t !== t);
        tx.wait = null;
        const undone = itemNames.filter(name => items[name].dirtyBy === t);
        undone.forEach(name => { items[name].dirtyBy = null; });
        const held = Object.keys(tx.held);
        held.forEach(name => release(name, t));
        tx.deferred = [];
        tx.status = 'aborted';
        queue = queue.filter(o => o.t !== t);
        record({ t, kind, label: kind === 'victim' ? 'ABORTED (deadlock)' : kind === 'cascade' ? 'ABORTED (cascade)' : 'ABORT', item: null });
        push(why(undone, held));
        const woken = itemNames.flatMap(name => drainQueue(name));
        wakeAll(woken);
        // Anyone who read what t wrote has read a value that never existed.
        for (const u of ids) {
            if (u === t || !txns[u].readsFrom.includes(t)) continue;
            if (txns[u].status === 'committed') {
                record({ t: u, kind: 'unrecoverable', label: 'NOT RECOVERABLE', item: null });
                push(`T${u} already committed after reading T${t}'s uncommitted write, so it cannot be rolled back. This schedule is not recoverable — exactly what strict 2PL rules out by holding T${t}'s exclusive lock until it ends.`, { unrecoverable: true });
            } else if (txns[u].status !== 'aborted') {
                abortTxn(u, 'cascade', (und) => `T${u} read a value that T${t} wrote, and T${t} has just aborted, so what T${u} read never existed. T${u} must abort too — a cascading abort${und.length ? `, undoing its own write to ${und.join(', ')}` : ''}.`);
            }
        }
    };

    const run = (op) => {
        const t = op.t, tx = txns[t];
        if (op.kind === 'lock') {
            const it = items[op.item];
            const has = tx.held[op.item];
            if (has === 'X' || (has === 'S' && op.mode === 'S')) {
                record({ t, kind: 'lock', label: opLabel(op), item: op.item, mode: op.mode, resumed: false });
                push(`T${t} already holds a lock on ${op.item} that covers this request.`);
                return;
            }
            const violates = tx.phase === 'shrinking';
            if (it.queue.length === 0 && compatible(op.item, t, op.mode)) {
                const sharers = others(op.item, t).map(g => `T${g.t}`);
                grant(op.item, t, op.mode);
                record({ t, kind: 'lock', label: opLabel(op), item: op.item, mode: op.mode, resumed: false, upgrade: has === 'S' });
                const n = Object.keys(tx.held).length;
                push(`T${t} ${has === 'S' ? `upgrades its shared lock on ${op.item} to exclusive` : `asks for ${modeName(op.mode)} lock on ${op.item}`}. ${sharers.length ? `${sharers.join(' and ')} ${sharers.length > 1 ? 'hold' : 'holds'} a shared lock too, and shared locks are compatible` : 'Nobody else holds it'}, so it is granted. ${violates ? `But T${t} has already released a lock — taking a new one breaks two-phase locking.` : `T${t} is in its growing phase: ${lockWord(n)} held.`}`);
                return;
            }
            const ahead = [...it.queue];
            const blockers = blockersOf(op.item, t, op.mode, ahead);
            const holdersIncompat = others(op.item, t).filter(g => op.mode === 'X' || g.mode === 'X');
            it.queue.push({ t, mode: op.mode });
            tx.status = 'waiting';
            tx.wait = { item: op.item, mode: op.mode, op };
            const deadlock = cycleThrough(t);
            record({ t, kind: 'wait', opKind: 'lock', label: opLabel(op), item: op.item, mode: op.mode, blockers, deadlock, resumed: false });
            let reason;
            if (holdersIncompat.length) {
                const who = holdersIncompat.map(g => `T${g.t}`).join(' and ');
                const what = holdersIncompat.every(g => g.mode === 'S') ? `${holdersIncompat.length > 1 ? 'hold shared locks' : 'holds a shared lock'}, and an exclusive lock is compatible with nothing` : 'holds an exclusive lock';
                reason = `${who} ${what}`;
            } else reason = `${ahead.map(w => `T${w.t}`).join(' and ')} ${ahead.length > 1 ? 'are' : 'is'} already queued for ${op.item}, and the queue is first come, first served`;
            const cycle = deadlock ? ` Now T${t} waits for T${blockers[0]}, and T${blockers[0]} is already waiting for T${t} — a cycle in the waits-for graph. Deadlock.` : '';
            push(`T${t} asks for ${modeName(op.mode)} lock on ${op.item}, but ${reason}. T${t} joins the wait queue.${cycle}`);
            if (deadlock) {
                abortTxn(t, 'victim', (undone) => `The database breaks the deadlock by aborting T${t}, the transaction whose request closed the cycle${undone.length ? `: its write to ${undone.join(', ')} is undone` : ''} and its locks are released. The application would catch the error and retry it.`);
            }
            return;
        }
        if (op.kind === 'read') {
            const u = items[op.item].dirtyBy;
            const dirty = u !== null && u !== t;
            if (dirty && !tx.readsFrom.includes(u)) tx.readsFrom.push(u);
            record({ t, kind: 'read', label: opLabel(op), item: op.item, dirty });
            push(`T${t} reads ${op.item} under its ${tx.held[op.item] === 'X' ? 'exclusive' : 'shared'} lock.${dirty ? ` But ${op.item} was last written by T${u}, which has not committed. T${t} has read uncommitted data and now depends on T${u}.` : ''}`);
            return;
        }
        if (op.kind === 'write') {
            items[op.item].dirtyBy = t;
            record({ t, kind: 'write', label: opLabel(op), item: op.item });
            push(`T${t} writes ${op.item} under its exclusive lock. Until T${t} commits, that value is uncommitted.`);
            return;
        }
        if (op.kind === 'unlock') {
            const held = tx.held[op.item];
            if (strict && held === 'X') {
                tx.deferred.push(op.item);
                record({ t, kind: 'deferred', label: opLabel(op), item: op.item });
                push(`T${t} is done with ${op.item}, but strict 2PL holds exclusive locks until the transaction ends. The lock on ${op.item} stays, so nobody can read T${t}'s uncommitted write.`);
                return;
            }
            const first = tx.phase === 'growing';
            tx.phase = 'shrinking';
            release(op.item, t);
            const n = Object.keys(tx.held).length;
            record({ t, kind: 'unlock', label: opLabel(op), item: op.item, first });
            const exposed = held === 'X' && items[op.item].dirtyBy === t;
            push(`T${t} releases ${op.item}. ${first
                ? `That is its first release, so its lock point has passed: T${t} is now in its shrinking phase and may not acquire any new lock.`
                : `Still shrinking: ${lockWord(n)} left.`}${exposed ? ` Its write to ${op.item} is not committed yet, but other transactions can now lock and read it.` : ''}`);
            wakeAll(drainQueue(op.item));
            return;
        }
        if (op.kind === 'commit') {
            const held = Object.keys(tx.held);
            const late = held.filter(i => tx.deferred.includes(i) || tx.held[i] === 'X');
            itemNames.forEach(name => { if (items[name].dirtyBy === t) items[name].dirtyBy = null; });
            held.forEach(name => release(name, t));
            tx.deferred = [];
            tx.phase = 'shrinking';
            tx.status = 'committed';
            record({ t, kind: 'commit', label: 'COMMIT', item: null });
            push(`T${t} commits${held.length ? ` and releases ${held.join(', ')}${strict && late.length ? ' — only now, at the end, do its exclusive locks go' : ''}` : ''}. Its writes are permanent.`);
            wakeAll(held.flatMap(name => drainQueue(name)));
            return;
        }
        abortTxn(t, 'abort', (undone, held) => `T${t} aborts${undone.length ? `: its write to ${undone.join(', ')} is undone` : ''}${held.length ? ` and it releases ${held.join(', ')}` : ''}.`);
    };

    push(`${blurb} ${strict ? 'Strict 2PL: exclusive locks are held until commit or abort.' : 'Basic 2PL: a transaction may release locks once it stops acquiring them.'}`.trim());
    let guard = 0;
    while (guard++ < 300) {
        const idx = queue.findIndex(op => txns[op.t].status === 'active');
        if (idx === -1) break;
        const [op] = queue.splice(idx, 1);
        run(op);
    }
    const committed = ids.filter(t => txns[t].status === 'committed');
    const aborted = ids.filter(t => txns[t].status === 'aborted');
    push(`Done. ${committed.length ? `Committed: ${committed.map(t => `T${t}`).join(', ')}.` : 'Nothing committed.'}${aborted.length ? ` Aborted: ${aborted.map(t => `T${t}`).join(', ')}.` : ''} Every transaction acquired all its locks before releasing any, so the committed transactions are conflict-serializable — in the order of their lock points.`, { final: true });
    const total = timeline.length;
    steps.forEach(s => { s.totalEvents = total; });
    return steps;
}

/* Two decisions the lock table settles on its own: is this request granted,
   queued, or queued into a deadlock; and under strict 2PL, does this unlock
   actually release anything yet. */
const predictFor = (step, next) => {
    if (!step || !next || !next.event || next.timeline.length !== step.timeline.length + 1) return null;
    const ev = next.event;
    if ((ev.kind === 'lock' || (ev.kind === 'wait' && ev.opKind === 'lock')) && !ev.resumed) {
        const me = step.txns.find(x => x.t === ev.t);
        if (me.held[ev.item]) return null;
        // An item nobody else holds or waits for is granted trivially.
        const contested = step.items.find(i => i.name === ev.item);
        if (!contested.granted.some(g => g.t !== ev.t) && contested.queue.length === 0) return null;
        const options = ['Granted', 'Waits', 'Waits — and deadlocks'];
        const correct = ev.kind === 'lock' ? 0 : ev.deadlock ? 2 : 1;
        const row = step.items.find(i => i.name === ev.item);
        const holders = row.granted.filter(g => g.t !== ev.t);
        let because;
        if (correct === 0) because = holders.length ? `Only shared locks are held on ${ev.item} and nobody is queued, and shared is compatible with shared.` : `Nobody holds or is waiting for ${ev.item}.`;
        else if (correct === 1) because = holders.length ? `${holders.map(g => `${g.mode} by T${g.t}`).join(', ')} is incompatible with ${ev.mode === 'S' ? 'a shared' : 'an exclusive'} request${row.queue.length ? ', and others are queued ahead' : ''} — but none of them is waiting for T${ev.t}, so there is no cycle.` : `Others are already queued for ${ev.item}, and the queue is first come, first served.`;
        else because = `T${ev.t} would wait for T${ev.blockers[0]}, and the waits-for graph already has T${ev.blockers[0]} waiting for T${ev.t}: a cycle.`;
        return { question: `T${ev.t} asks for ${ev.mode === 'S' ? 'a shared' : 'an exclusive'} lock on ${ev.item}. What happens?`, options, correct, because };
    }
    if (step.mode === 'strict' && (ev.kind === 'unlock' || ev.kind === 'deferred')) {
        const options = ['Released now', 'Held until commit'];
        const me = step.txns.find(x => x.t === ev.t);
        const heldMode = me.held[ev.item];
        return {
            question: `Strict 2PL. T${ev.t} unlocks ${ev.item}, which it holds in ${heldMode === 'X' ? 'exclusive' : 'shared'} mode. Is ${ev.item} released now?`,
            options,
            correct: ev.kind === 'unlock' ? 0 : 1,
            because: ev.kind === 'unlock'
                ? 'Strict 2PL only delays exclusive locks. A shared lock protects nothing anyone else could read dirty, so it can go early.'
                : 'Exclusive locks guard uncommitted writes. Strict 2PL keeps them until the transaction commits or aborts, so nobody can read the write too early.',
        };
    }
    return null;
};

const quizQuestions = [
    {
        question: 'What does the "two phases" of two-phase locking refer to?',
        options: [
            'Locking reads first, then writes',
            'A growing phase that only acquires locks, then a shrinking phase that only releases them',
            'Preparing and then committing on two servers',
            'Shared locks first, then exclusive locks',
        ],
        correct: 1,
        explanation: 'Once a transaction releases any lock it may never acquire another. The moment of its last acquisition is its lock point, and ordering transactions by lock point gives an equivalent serial schedule.',
    },
    {
        question: 'Why does basic 2PL allow cascading aborts?',
        options: [
            'Because shared locks are compatible',
            'Because a transaction can release an exclusive lock before it commits, letting others read an uncommitted write',
            'Because deadlocks are never detected',
            'Because locks are taken in the wrong order',
        ],
        correct: 1,
        explanation: 'Releasing an exclusive lock early exposes an uncommitted value. If the writer then aborts, everyone who read it must abort as well. Strict 2PL holds exclusive locks until commit, which makes schedules cascadeless.',
    },
    {
        question: 'T1 holds X(A) and waits for B; T2 holds X(B) and requests A. What happens?',
        options: ['T2 is granted A', 'T2 waits and both eventually proceed', 'A deadlock: one transaction must be aborted', 'T1 is granted B immediately'],
        correct: 2,
        explanation: 'T2 waits for T1 and T1 waits for T2 — a cycle in the waits-for graph. 2PL does not prevent deadlocks; the database detects the cycle (or times out) and aborts a victim.',
    },
];

const TXN_COLOR = {
    1: { text: 'text-blue-300', line: '#60a5fa' },
    2: { text: 'text-orange-300', line: '#fb923c' },
    3: { text: 'text-violet-300', line: '#a78bfa' },
};

function EventChip({ e, latest }) {
    let tone = 'bg-slate-800 border-slate-600 text-slate-100';
    if (e.kind === 'lock') tone = e.mode === 'X' ? 'bg-red-500/15 border-red-400/60 text-red-200' : 'bg-sky-500/15 border-sky-400/60 text-sky-200';
    if (e.kind === 'write') tone = 'bg-amber-500/15 border-amber-500/60 text-amber-200';
    if (e.kind === 'unlock') tone = 'bg-slate-800 border-teal-500/60 text-teal-200';
    if (e.kind === 'deferred') tone = 'bg-slate-800 border-dashed border-teal-500/60 text-teal-300/70';
    if (e.kind === 'commit') tone = 'bg-green-500/15 border-green-500/60 text-green-300';
    if (['abort', 'victim', 'cascade', 'unrecoverable'].includes(e.kind)) tone = 'bg-red-500/20 border-red-500 text-red-300';
    if (e.kind === 'wait') tone = e.deadlock ? 'bg-red-500/20 border-red-500 border-dashed text-red-200' : 'bg-yellow-400/10 border-yellow-400/70 border-dashed text-yellow-200';
    if (e.dirty) tone = 'bg-red-500/25 border-red-500 text-red-200';
    return (
        <div className={`w-full min-w-0 flex items-center justify-between gap-1 px-2 py-1.5 rounded-md border font-mono text-[11px] transition-all duration-300 ${tone} ${latest ? 'ring-2 ring-blue-400/70 scale-[1.02]' : ''}`}>
            <span className="flex items-center gap-1 min-w-0 truncate">{e.kind === 'wait' && <Lock className="h-3 w-3 flex-shrink-0" />}{e.label}</span>
            {e.kind === 'wait' && <span className="text-[10px]">{e.deadlock ? 'deadlock' : 'waits'}</span>}
            {e.kind === 'deferred' && <span className="text-[10px]">kept</span>}
            {e.resumed && <span className="text-[10px]">granted</span>}
            {e.dirty && <span className="text-[10px]">dirty</span>}
        </div>
    );
}

function LockChart({ step }) {
    const W = 560, H = 120, PADL = 28, PADB = 18;
    const total = Math.max(step.totalEvents, 1);
    const maxLocks = Math.max(2, ...step.counts.flatMap(c => Object.values(c)));
    const x = (k) => PADL + (k / total) * (W - PADL - 8);
    const y = (n) => H - PADB - (n / maxLocks) * (H - PADB - 10);
    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="overflow-visible">
            {Array.from({ length: maxLocks + 1 }).map((_, n) => (
                <g key={n}>
                    <line x1={PADL} x2={W - 8} y1={y(n)} y2={y(n)} stroke="#1e293b" strokeWidth="1" />
                    <text x={PADL - 8} y={y(n) + 3} fontSize="9" textAnchor="end" fill="#64748b">{n}</text>
                </g>
            ))}
            <text x={PADL} y={H - 2} fontSize="9" fill="#64748b">locks held over time →</text>
            {step.ids.map((t, k) => {
                const pts = [];
                step.counts.forEach((c, i) => {
                    if (i > 0) pts.push(`${x(i)},${y(step.counts[i - 1][t])}`);
                    pts.push(`${x(i)},${y(c[t])}`);
                });
                const offset = (k - (step.ids.length - 1) / 2) * 2;
                const firstRelease = step.timeline.findIndex(e => e.t === t && (e.kind === 'unlock' || e.kind === 'commit'));
                return (
                    <g key={t} transform={`translate(0, ${offset})`}>
                        <polyline points={pts.join(' ')} fill="none" stroke={TXN_COLOR[t].line} strokeWidth="2.5" strokeLinejoin="round" />
                        {firstRelease !== -1 && (
                            <g>
                                <circle cx={x(firstRelease)} cy={y(step.counts[firstRelease][t])} r="4" fill={TXN_COLOR[t].line} />
                                <text x={x(firstRelease)} y={y(step.counts[firstRelease][t]) - 7} fontSize="9" textAnchor="middle" fill={TXN_COLOR[t].line}>lock point T{t}</text>
                            </g>
                        )}
                    </g>
                );
            })}
        </svg>
    );
}

function WaitsForGraph({ step }) {
    const pos = step.ids.length === 3
        ? { [step.ids[0]]: { x: 40, y: 30 }, [step.ids[1]]: { x: 160, y: 30 }, [step.ids[2]]: { x: 100, y: 95 } }
        : Object.fromEntries(step.ids.map((t, k) => [t, { x: 40 + k * 120, y: 55 }]));
    const deadlock = step.event && step.event.kind === 'wait' && step.event.deadlock;
    return (
        <svg viewBox="0 0 200 125" width="100%" className="overflow-visible block mx-auto" style={{ maxWidth: 260 }}>
            <defs>
                <marker id="wf-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#facc15" /></marker>
                <marker id="wf-arrow-red" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#f87171" /></marker>
            </defs>
            {step.waits.map((e, k) => {
                const a = pos[e.from], b = pos[e.to];
                const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
                const nx = -dy / len, ny = dx / len;
                const sx = a.x + (dx / len) * 18 + nx * 5, sy = a.y + (dy / len) * 18 + ny * 5;
                const ex = b.x - (dx / len) * 20 + nx * 5, ey = b.y - (dy / len) * 20 + ny * 5;
                return <path key={k} d={`M ${sx} ${sy} Q ${(sx + ex) / 2 + nx * 14} ${(sy + ey) / 2 + ny * 14} ${ex} ${ey}`} fill="none"
                    stroke={deadlock ? '#f87171' : '#facc15'} strokeWidth="2" markerEnd={deadlock ? 'url(#wf-arrow-red)' : 'url(#wf-arrow)'} />;
            })}
            {step.ids.map(t => {
                const tx = step.txns.find(x => x.t === t);
                const p = pos[t];
                const fill = tx.status === 'committed' ? '#14532d' : tx.status === 'aborted' ? '#7f1d1d' : tx.status === 'waiting' ? '#713f12' : '#1e293b';
                return (
                    <g key={t}>
                        <circle cx={p.x} cy={p.y} r="17" fill={fill} stroke={TXN_COLOR[t].line} strokeWidth="2" style={{ transition: 'fill 0.3s ease' }} />
                        <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="12" fontWeight="700" fill="#f8fafc">T{t}</text>
                    </g>
                );
            })}
        </svg>
    );
}

function TwoPhaseLockingPage() {
    const [presetId, setPresetId] = useState('phases');
    const [mode, setMode] = useState('basic');
    const [plan, setPlan] = useState(PRESETS[0].plan);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1000);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const preset = PRESETS.find(p => p.id === presetId);

    useEffect(() => {
        setStepHistory(generateSteps(plan, mode, PRESETS.find(p => p.id === presetId).blurb));
        setCurrentStep(0);
    }, [plan, mode, presetId]);

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
    const shuffle = () => { setIsPlaying(false); setPlan(interleave(preset.plan)); };
    const reset = () => { setIsPlaying(false); setCurrentStep(0); };

    const step = stepHistory[currentStep];
    const lastIdx = step ? step.timeline.length - 1 : -1;

    const handleQuizAnswer = (idx) => {
        if (quizState.answered) return;
        const correct = idx === quizQuestions[quizState.current].correct;
        setQuizState(s => ({ ...s, selected: idx, answered: true, score: correct ? s.score + 1 : s.score }));
    };
    const nextQuestion = () => {
        if (quizState.current + 1 >= quizQuestions.length) setQuizState(s => ({ ...s, complete: true }));
        else setQuizState(s => ({ ...s, current: s.current + 1, selected: null, answered: false }));
    };

    const codeExample = `from collections import deque

COMPATIBLE = {('S', 'S')}          # every other pair conflicts

class LockTable:
    def __init__(self):
        self.granted = {}           # item -> {txn: mode}
        self.queue = {}             # item -> deque of (txn, mode)

    def request(self, txn, item, mode):
        held = self.granted.setdefault(item, {})
        waiting = self.queue.setdefault(item, deque())
        others = [m for t, m in held.items() if t != txn]
        if not waiting and all((m, mode) in COMPATIBLE for m in others):
            held[txn] = 'X' if mode == 'X' or held.get(txn) == 'X' else 'S'
            return True             # granted
        waiting.append((txn, mode))
        return False                # caller blocks (and checks for deadlock)

    def release_all(self, txn):     # strict 2PL: called only at commit/abort
        for item, held in self.granted.items():
            if held.pop(txn, None):
                self._drain(item)

    def _drain(self, item):
        held, waiting = self.granted[item], self.queue[item]
        while waiting:
            txn, mode = waiting[0]
            others = [m for t, m in held.items() if t != txn]
            if not all((m, mode) in COMPATIBLE for m in others):
                break
            waiting.popleft()
            held[txn] = mode        # wake txn up`;

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
                            <Lock className="h-10 w-10" />Two-Phase Locking
                        </h1>
                        <p className="text-xl text-blue-100 mb-6 max-w-3xl mx-auto">
                            Acquire every lock you need, then release them — never the other way round. That one rule makes every schedule serializable, and leaves deadlocks and cascading aborts to deal with.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Shared + exclusive locks</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Guarantees conflict-serializability</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Deadlocks still possible</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6 mb-6">
                            <div className="space-y-3 mb-5">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs uppercase tracking-wide text-slate-500 w-20">Scenario</span>
                                    {PRESETS.map(p => (
                                        <button key={p.id} onClick={() => choosePreset(p)}
                                            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${p.id === presetId ? 'bg-blue-500/20 border-blue-400 text-blue-200' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                                            {p.name}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs uppercase tracking-wide text-slate-500 w-20">Protocol</span>
                                    {[['basic', 'Basic 2PL'], ['strict', 'Strict 2PL']].map(([id, label]) => (
                                        <button key={id} onClick={() => { setIsPlaying(false); setMode(id); }}
                                            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${id === mode ? 'bg-teal-500/20 border-teal-400 text-teal-200' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                                            {label}
                                        </button>
                                    ))}
                                </div>
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
                                <button onClick={shuffle} title="Same transactions, different interleaving" className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium">
                                    <Shuffle size={18} />Shuffle Timing
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
                                    <span className="text-sm text-slate-500">{mode === 'strict' ? 'Strict 2PL' : 'Basic 2PL'}</span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-2">
                                    <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: `${((currentStep + 1) / Math.max(stepHistory.length, 1)) * 100}%` }} />
                                </div>
                            </div>

                            {step && (
                                <div className="space-y-4 mb-5">
                                    <div className="grid grid-cols-1 md:grid-cols-5 lg:grid-cols-1 xl:grid-cols-5 gap-4">
                                        <div className="md:col-span-3 lg:col-span-1 xl:col-span-3 min-w-0 bg-slate-800/50 rounded-lg border border-slate-700/60 p-3">
                                            <div className="grid gap-x-2 gap-y-1.5 text-xs" style={{ gridTemplateColumns: `1.5rem repeat(${step.ids.length}, minmax(0, 1fr))` }}>
                                                <div />
                                                {step.txns.map(tx => (
                                                    <div key={tx.t} className="flex items-center justify-between gap-1 pb-2 border-b border-slate-700">
                                                        <span className={`font-bold ${TXN_COLOR[tx.t].text}`}>T{tx.t}</span>
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${tx.status === 'committed' ? 'bg-green-500/20 text-green-300' : tx.status === 'aborted' ? 'bg-red-500/20 text-red-300' : tx.status === 'waiting' ? 'bg-yellow-400/20 text-yellow-200' : tx.phase === 'growing' ? 'bg-sky-500/15 text-sky-300' : 'bg-teal-500/15 text-teal-300'}`}>
                                                            {tx.status === 'active' ? tx.phase : tx.status}
                                                        </span>
                                                    </div>
                                                ))}
                                                {step.timeline.map((e, i) => (
                                                    <React.Fragment key={`e${i}`}>
                                                        <div className="text-slate-600 font-mono text-right pt-1.5">{i + 1}</div>
                                                        {step.ids.map(t => (
                                                            <div key={t} className="min-h-[2rem] flex items-center">
                                                                {e.t === t
                                                                    ? <EventChip e={e} latest={i === lastIdx} />
                                                                    : e.waiting.includes(t) && (
                                                                        <div className="h-full w-full flex items-center gap-2 pl-2">
                                                                            <div className="w-1 self-stretch rounded bg-yellow-400/50" />
                                                                            <span className="text-[10px] text-yellow-300/70">waiting</span>
                                                                        </div>
                                                                    )}
                                                            </div>
                                                        ))}
                                                    </React.Fragment>
                                                ))}
                                                {step.remaining.map((op, i) => (
                                                    <React.Fragment key={`r${i}`}>
                                                        <div />
                                                        {step.ids.map(t => (
                                                            <div key={t} className="min-h-[1.75rem] flex items-center">
                                                                {op.t === t && <div className="w-full min-w-0 truncate px-2 py-1 rounded-md border border-dashed border-slate-600 text-slate-500 font-mono text-[11px]">{op.label}</div>}
                                                            </div>
                                                        ))}
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="md:col-span-2 lg:col-span-1 xl:col-span-2 space-y-3">
                                            <div className="bg-slate-800/50 rounded-lg border border-slate-700/60 p-3">
                                                <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Lock table</div>
                                                <div className="space-y-2">
                                                    {step.items.map(it => {
                                                        const touched = step.event && step.event.item === it.name;
                                                        return (
                                                            <div key={it.name} className={`rounded-md border p-2 transition-colors ${touched ? 'border-blue-400/60 bg-blue-500/10' : 'border-slate-700/60'}`}>
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <span className="font-mono font-bold text-slate-200">{it.name}</span>
                                                                    {it.dirtyBy !== null && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300">uncommitted write by T{it.dirtyBy}</span>}
                                                                </div>
                                                                <div className="flex flex-wrap items-center gap-1 text-[10px]">
                                                                    <span className="text-slate-500 mr-1">granted</span>
                                                                    {it.granted.length === 0 && <span className="text-slate-600">—</span>}
                                                                    {it.granted.map((g, k) => (
                                                                        <span key={k} className={`px-1.5 py-0.5 rounded font-mono border ${g.mode === 'X' ? 'bg-red-500/15 border-red-500/50 text-red-300' : 'bg-sky-500/15 border-sky-500/50 text-sky-300'}`}>{g.mode}:T{g.t}</span>
                                                                    ))}
                                                                </div>
                                                                {it.queue.length > 0 && (
                                                                    <div className="flex flex-wrap items-center gap-1 text-[10px] mt-1">
                                                                        <span className="text-slate-500 mr-1">queue</span>
                                                                        {it.queue.map((w, k) => (
                                                                            <span key={k} className="px-1.5 py-0.5 rounded font-mono border border-dashed border-yellow-400/60 text-yellow-200">{w.mode}:T{w.t}</span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            <div className="bg-slate-800/50 rounded-lg border border-slate-700/60 p-3">
                                                <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Waits-for graph</div>
                                                <WaitsForGraph step={step} />
                                                {step.waits.length === 0 && <div className="text-[11px] text-slate-600 text-center">nobody is waiting</div>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-800/50 rounded-lg border border-slate-700/60 p-3">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs uppercase tracking-wide text-slate-500">Locks held — growing, then shrinking</span>
                                            <div className="flex gap-3 text-[11px]">
                                                {step.ids.map(t => <span key={t} className={TXN_COLOR[t].text}>T{t}</span>)}
                                            </div>
                                        </div>
                                        <LockChart step={step} />
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
                                <h3 className="font-bold text-white">Lock Compatibility</h3>
                            </div>
                            <table className="w-full text-sm text-center">
                                <thead>
                                    <tr className="text-slate-500 text-xs">
                                        <th className="text-left font-medium pb-2">held \ asked</th>
                                        <th className="font-medium pb-2">S</th>
                                        <th className="font-medium pb-2">X</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[['S', true, false], ['X', false, false]].map(([held, s, x]) => (
                                        <tr key={held} className="border-t border-slate-800">
                                            <td className="text-left py-2 font-mono text-slate-300">{held}</td>
                                            {[s, x].map((ok, k) => (
                                                <td key={k} className="py-2">
                                                    {ok ? <CheckCircle className="h-4 w-4 text-green-400 inline" /> : <XCircle className="h-4 w-4 text-red-400 inline" />}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="mt-4 space-y-2 text-xs text-slate-400 leading-relaxed">
                                <p><strong className="text-slate-200">Basic 2PL</strong> guarantees conflict-serializability but can expose uncommitted writes, so one abort can cascade.</p>
                                <p><strong className="text-slate-200">Strict 2PL</strong> keeps exclusive locks until commit: no cascading aborts, recoverable schedules. Most systems go further and hold every lock to the end (rigorous 2PL).</p>
                                <p><strong className="text-slate-200">Neither</strong> prevents deadlock — the database detects cycles in the waits-for graph and aborts a victim.</p>
                            </div>
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

export default TwoPhaseLockingPage;
