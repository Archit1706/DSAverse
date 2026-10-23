"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Shuffle, Info, Code2, Layers, Lock, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* A small lock-based transaction engine. Writes always take an exclusive lock
   held to commit (no level allows dirty writes); the isolation level only
   changes how reads are protected. That is the model the SQL standard's
   definitions come from, and it reproduces the textbook table exactly. */
const LEVELS = [
    { id: 'RU', name: 'Read Uncommitted', rule: 'Reads take no locks at all, so they can see writes that have not committed yet.' },
    { id: 'RC', name: 'Read Committed', rule: 'A read takes a shared lock only for as long as the read itself, so it never sees uncommitted data — but the row can change straight afterwards.' },
    { id: 'RR', name: 'Repeatable Read', rule: 'Every row a transaction reads stays share-locked until it commits, so nobody can change it underneath. Rows that do not exist yet cannot be locked.' },
    { id: 'SER', name: 'Serializable', rule: 'Read locks are held to commit and a predicate lock covers the WHERE clause itself, so even a new row that would match has to wait.' },
];
const levelOf = (id) => LEVELS.find(l => l.id === id);

const ANOMALIES = [
    { id: 'dirty', name: 'Dirty read' },
    { id: 'nonrepeatable', name: 'Non-repeatable read' },
    { id: 'phantom', name: 'Phantom' },
    { id: 'lost', name: 'Lost update' },
];

const INITIAL_ROWS = [{ id: 'A', balance: 100 }, { id: 'B', balance: 200 }];
const RICH = 150;
const PREDICATE = `balance > ${RICH}`;

const SCENARIOS = [
    {
        id: 'dirty', name: 'Dirty read', target: 'dirty', retry: false,
        story: 'T1 sets A to 150 and then rolls back. T2 reads A in between.',
        plan: [
            { t: 1, kind: 'write', key: 'A', set: { value: 150 } },
            { t: 2, kind: 'read', key: 'A', into: 'a' },
            { t: 1, kind: 'abort' },
            { t: 2, kind: 'commit' },
        ],
    },
    {
        id: 'nonrepeatable', name: 'Non-repeatable read', target: 'nonrepeatable', retry: false,
        story: 'T2 reads A twice. In between, T1 changes A to 150 and commits.',
        plan: [
            { t: 2, kind: 'read', key: 'A', into: 'a1' },
            { t: 1, kind: 'write', key: 'A', set: { value: 150 } },
            { t: 1, kind: 'commit' },
            { t: 2, kind: 'read', key: 'A', into: 'a2' },
            { t: 2, kind: 'commit' },
        ],
    },
    {
        id: 'phantom', name: 'Phantom', target: 'phantom', retry: false,
        story: `T2 counts the accounts with ${PREDICATE} twice. In between, T1 inserts a new account C with 300.`,
        plan: [
            { t: 2, kind: 'count', into: 'n1' },
            { t: 1, kind: 'insert', key: 'C', set: { value: 300 } },
            { t: 1, kind: 'commit' },
            { t: 2, kind: 'count', into: 'n2' },
            { t: 2, kind: 'commit' },
        ],
    },
    {
        id: 'lost', name: 'Lost update', target: 'lost', retry: true,
        story: 'T1 deposits 50 and T2 withdraws 30, each by reading A and writing back a new balance. Run one after the other, A ends at 120.',
        plan: [
            { t: 1, kind: 'read', key: 'A', into: 'a' },
            { t: 2, kind: 'read', key: 'A', into: 'a' },
            { t: 1, kind: 'write', key: 'A', set: { from: 'a', add: 50 } },
            { t: 1, kind: 'commit' },
            { t: 2, kind: 'write', key: 'A', set: { from: 'a', add: -30 } },
            { t: 2, kind: 'commit' },
        ],
    },
];
const scenarioOf = (id) => SCENARIOS.find(s => s.id === id);

const evalSet = (set, vars) => (set.value !== undefined ? set.value : vars[set.from] + set.add);

const opLabel = (op) => {
    if (op.kind === 'read') return `READ ${op.key}`;
    if (op.kind === 'count') return `COUNT(${PREDICATE})`;
    if (op.kind === 'write') {
        if (op.set.value !== undefined) return `WRITE ${op.key} = ${op.set.value}`;
        return `WRITE ${op.key} = ${op.set.from} ${op.set.add >= 0 ? '+' : '−'} ${Math.abs(op.set.add)}`;
    }
    if (op.kind === 'insert') return `INSERT ${op.key} = ${op.set.value}`;
    if (op.kind === 'commit') return 'COMMIT';
    return 'ROLLBACK';
};

/** Runs one transaction at a time to completion, in the given order. */
function serialRun(plan, order) {
    const rows = Object.fromEntries(INITIAL_ROWS.map(r => [r.id, r.balance]));
    for (const t of order) {
        const vars = {}, pending = {};
        for (const op of plan.filter(o => o.t === t)) {
            if (op.kind === 'read') vars[op.into] = op.key in pending ? pending[op.key] : rows[op.key];
            else if (op.kind === 'write' || op.kind === 'insert') pending[op.key] = evalSet(op.set, vars);
            else if (op.kind === 'commit') Object.assign(rows, pending);
        }
    }
    return rows;
}

/** A random interleaving that keeps each transaction's own order. */
function interleave(plan, rand = Math.random) {
    const a = plan.filter(o => o.t === 1), b = plan.filter(o => o.t === 2);
    const out = [];
    let i = 0, j = 0;
    while (i < a.length || j < b.length) {
        if (j >= b.length || (i < a.length && rand() < 0.5)) out.push(a[i++]);
        else out.push(b[j++]);
    }
    return out;
}

function generateSteps(plan, levelId, scenario) {
    const level = levelOf(levelId);
    const lockingReads = levelId !== 'RU';
    const longReads = levelId === 'RR' || levelId === 'SER';
    const rows = {};
    INITIAL_ROWS.forEach(r => { rows[r.id] = { committed: r.balance, pending: null }; });
    const locks = {};
    let preds = [];
    const mkTxn = (attempt) => ({ status: 'active', vars: {}, attempt, wait: null, firstRead: {}, firstCount: null, wrote: {}, wroteAfterCount: false });
    const txns = { 1: mkTxn(1), 2: mkTxn(1) };
    const anomalies = { dirty: false, nonrepeatable: false, phantom: false, lost: false };
    const timeline = [];
    const steps = [];
    let queue = plan.map(op => ({ ...op }));

    const lockOf = (id) => { if (!locks[id]) locks[id] = { S: [], X: null }; return locks[id]; };
    const blockersS = (id, t) => { const l = locks[id]; return l && l.X !== null && l.X !== t ? [l.X] : []; };
    const blockersX = (id, t) => {
        const l = locks[id];
        if (!l) return [];
        const b = l.S.filter(x => x !== t);
        if (l.X !== null && l.X !== t) b.push(l.X);
        return [...new Set(b)];
    };
    const grantS = (id, t) => { const l = lockOf(id); if (l.X !== t && !l.S.includes(t)) l.S.push(t); };
    const grantX = (id, t) => { const l = lockOf(id); l.X = t; l.S = l.S.filter(x => x !== t); };
    const lockModeHeld = (id, t) => (locks[id]?.X === t ? 'exclusive' : 'shared');
    /* What transaction t sees in row id: its own write, someone else's
       uncommitted write (only when the level lets it look), or the committed value. */
    const seen = (id, t, dirtyOk) => {
        const r = rows[id];
        if (r.pending && (r.pending.t === t || dirtyOk)) return { value: r.pending.value, dirty: r.pending.t !== t, from: r.pending.t };
        return { value: r.committed, dirty: false, from: null };
    };

    const snap = () => ({
        rows: Object.keys(rows).sort().map(id => ({ id, committed: rows[id].committed, pending: rows[id].pending ? { ...rows[id].pending } : null })),
        locks: Object.keys(locks).sort().flatMap(id => [
            ...(locks[id].X !== null ? [{ id, mode: 'X', t: locks[id].X }] : []),
            ...locks[id].S.map(t => ({ id, mode: 'S', t })),
        ]),
        preds: preds.map(p => ({ ...p })),
        txns: [1, 2].map(t => ({ t, status: txns[t].status, attempt: txns[t].attempt, vars: { ...txns[t].vars }, waitingOn: txns[t].wait ? [...txns[t].wait.holders] : null })),
        timeline: timeline.map(e => ({ ...e })),
        remaining: queue.map(op => ({ t: op.t, label: opLabel(op) })),
        anomalies: { ...anomalies },
    });
    const record = (e) => {
        const entry = { ...e, attempt: txns[e.t].attempt };
        entry.waiting = [1, 2].filter(t => txns[t].status === 'waiting');
        timeline.push(entry);
        return entry;
    };
    const push = (event, explanation, extra = {}) => steps.push({ level: levelId, event, explanation, ...snap(), ...extra });

    /* Try an operation. Returns { blocked } with no side effects, or performs it. */
    const attempt = (op) => {
        const t = op.t, tx = txns[t];
        if (op.kind === 'read') {
            if (lockingReads) {
                const b = blockersS(op.key, t);
                if (b.length) return { blocked: b, on: op.key };
                if (longReads) grantS(op.key, t);
            }
            const v = seen(op.key, t, !lockingReads);
            tx.vars[op.into] = v.value;
            if (v.dirty) anomalies.dirty = true;
            const before = tx.firstRead[op.key];
            const changed = before !== undefined && before !== v.value && !tx.wrote[op.key];
            if (changed) anomalies.nonrepeatable = true;
            if (before === undefined) tx.firstRead[op.key] = v.value;
            return { result: v.value, dirty: v.dirty, from: v.from, changed, before };
        }
        if (op.kind === 'count') {
            const ids = Object.keys(rows).sort();
            if (lockingReads) {
                const b = [...new Set(ids.flatMap(id => blockersS(id, t)))];
                if (b.length) return { blocked: b, on: ids.filter(id => blockersS(id, t).length).join(', ') };
                if (longReads) ids.forEach(id => grantS(id, t));
                if (levelId === 'SER' && !preds.some(p => p.t === t)) preds.push({ t, label: PREDICATE });
            }
            let n = 0, clean = 0, from = null;
            for (const id of ids) {
                const v = seen(id, t, !lockingReads);
                if (v.value !== null && v.value > RICH) { n++; if (v.dirty) from = v.from; }
                const c = seen(id, t, false);
                if (c.value !== null && c.value > RICH) clean++;
            }
            const dirty = n !== clean;
            if (dirty) anomalies.dirty = true;
            tx.vars[op.into] = n;
            const before = tx.firstCount;
            // A change the transaction caused itself is not a phantom.
            const changed = before !== null && before !== n && !tx.wroteAfterCount;
            if (changed) anomalies.phantom = true;
            if (before === null) tx.firstCount = n;
            return { result: n, dirty, from, changed, before };
        }
        if (op.kind === 'write') {
            const b = blockersX(op.key, t);
            if (b.length) return { blocked: b, on: op.key, mode: locks[op.key].X !== null && locks[op.key].X !== t ? 'exclusive' : 'shared' };
            grantX(op.key, t);
            const value = evalSet(op.set, tx.vars);
            rows[op.key].pending = { t, value };
            tx.wrote[op.key] = true;
            if (tx.firstCount !== null) tx.wroteAfterCount = true;
            return { result: value };
        }
        // insert
        const value = op.set.value;
        if (levelId === 'SER' && value > RICH) {
            const b = [...new Set(preds.filter(p => p.t !== t).map(p => p.t))];
            if (b.length) return { blocked: b, on: 'predicate' };
        }
        rows[op.key] = { committed: null, pending: { t, value } };
        grantX(op.key, t);
        tx.wrote[op.key] = true;
        if (tx.firstCount !== null) tx.wroteAfterCount = true;
        return { result: value };
    };

    const finish = (t, commit) => {
        for (const id of Object.keys(rows)) {
            const r = rows[id];
            if (!r.pending || r.pending.t !== t) continue;
            if (commit) { r.committed = r.pending.value; r.pending = null; }
            else { r.pending = null; if (r.committed === null) { delete rows[id]; delete locks[id]; } }
        }
        for (const id of Object.keys(locks)) {
            const l = locks[id];
            l.S = l.S.filter(x => x !== t);
            if (l.X === t) l.X = null;
        }
        preds = preds.filter(p => p.t !== t);
        txns[t].status = commit ? 'committed' : 'aborted';
    };

    const deadlocked = (t) => {
        const seenTx = new Set();
        const stack = [...txns[t].wait.holders];
        while (stack.length) {
            const u = stack.pop();
            if (u === t) return true;
            if (seenTx.has(u)) continue;
            seenTx.add(u);
            if (txns[u].status === 'waiting') stack.push(...txns[u].wait.holders);
        }
        return false;
    };

    const explainDone = (op, r, resumed) => {
        const t = op.t;
        const pre = resumed ? `The lock T${t} was waiting for is free, so its ${op.kind === 'read' ? 'read' : op.kind === 'count' ? 'count' : op.kind} goes ahead. ` : '';
        if (op.kind === 'read') {
            let s;
            if (r.dirty) s = `T${t} reads ${op.key} = ${r.result}. Read Uncommitted takes no read lock, so it sees T${r.from}'s uncommitted write — a dirty read. If T${r.from} rolls back, T${t} has used a value that never existed.`;
            else if (!lockingReads) s = `T${t} reads ${op.key} = ${r.result}. Read Uncommitted takes no read lock; there just happens to be no uncommitted write on ${op.key} right now.`;
            else if (!longReads) s = `T${t} takes a shared lock on ${op.key}, reads ${r.result} and drops the lock at once. Read Committed only promises the value was committed at the moment of the read.`;
            else s = `T${t} takes a shared lock on ${op.key} and reads ${r.result}. At ${level.name} the lock stays until T${t} commits, so nobody can change ${op.key} underneath it.`;
            if (r.changed) s += ` It read ${r.before} earlier in the same transaction — a non-repeatable read.`;
            return pre + s;
        }
        if (op.kind === 'count') {
            let s = `T${t} counts the accounts with ${PREDICATE}: ${r.result}.`;
            if (!lockingReads) s += ' No locks are taken.';
            else if (!longReads) s += ' Each row is share-locked only while it is being read.';
            else if (levelId === 'RR') s += ' Every row it scanned stays share-locked, but a row that does not exist yet cannot be locked.';
            else s += ` It also takes a predicate lock on ${PREDICATE}, which covers rows that do not exist yet.`;
            if (r.dirty) s += ` That count includes T${r.from}'s uncommitted row — a dirty read.`;
            if (r.changed) s += ` The same query returned ${r.before} a moment ago: a row has ${r.result > r.before ? 'appeared' : 'vanished'} — a phantom.`;
            return pre + s;
        }
        if (op.kind === 'write') {
            const how = op.set.value !== undefined
                ? `writes ${op.key} = ${r.result}`
                : `writes ${op.key} = ${op.set.from} ${op.set.add >= 0 ? '+' : '−'} ${Math.abs(op.set.add)} = ${r.result}, using the ${txns[t].vars[op.set.from]} it read`;
            return pre + `T${t} takes an exclusive lock on ${op.key} and ${how}. The new value is uncommitted: only T${t} can see it until it commits.`;
        }
        const otherCounted = txns[3 - t].firstCount !== null && txns[3 - t].status === 'active';
        let s = `T${t} inserts account ${op.key} with balance ${r.result} and holds an exclusive lock on the new row.`;
        if (levelId === 'RR' && otherCounted) s += ` Nothing stops it: T${3 - t}'s shared locks are on the rows that existed, and ${op.key} is new.`;
        return pre + s;
    };

    const emitDone = (op, r, resumed) => {
        const e = record({ t: op.t, kind: op.kind, label: opLabel(op), result: r.result, dirty: Boolean(r.dirty), changed: Boolean(r.changed), resumed, key: op.key ?? null });
        push(e, explainDone(op, r, resumed));
    };

    const wake = () => {
        let progress = true;
        while (progress) {
            progress = false;
            for (const t of [1, 2]) {
                const tx = txns[t];
                if (tx.status !== 'waiting') continue;
                const op = tx.wait.op;
                const r = attempt(op);
                if (r.blocked) { tx.wait.holders = r.blocked; continue; }
                tx.status = 'active';
                tx.wait = null;
                emitDone(op, r, true);
                progress = true;
            }
        }
    };

    const run = (op) => {
        const t = op.t, tx = txns[t];
        if (op.kind === 'commit' || op.kind === 'abort') {
            const wrote = Object.keys(tx.wrote);
            const restored = op.kind === 'abort' ? wrote.filter(k => rows[k] && rows[k].committed !== null).map(k => `${k} is ${rows[k].committed} again`) : [];
            finish(t, op.kind === 'commit');
            const e = record({ t, kind: op.kind, label: opLabel(op), resumed: false, key: null });
            const text = op.kind === 'commit'
                ? (wrote.length
                    ? `T${t} commits: its write to ${wrote.join(', ')} becomes visible to everyone, and all its locks are released.`
                    : `T${t} commits and releases all its locks.`)
                : `T${t} rolls back: its uncommitted write is thrown away${restored.length ? ` and ${restored.join(', ')}` : ''}. Its locks are released.`;
            push(e, text);
            wake();
            return;
        }
        const r = attempt(op);
        if (!r.blocked) { emitDone(op, r, false); return; }

        tx.status = 'waiting';
        tx.wait = { op, holders: r.blocked };
        const h = r.blocked.map(x => `T${x}`).join(' and ');
        const wouldWrite = op.kind === 'write' || op.kind === 'insert' ? evalSet(op.set, tx.vars) : null;
        const e = record({ t, kind: 'wait', opKind: op.kind, label: opLabel(op), holders: r.blocked, on: r.on, resumed: false, key: op.key ?? null, wouldWrite });
        let text;
        if (op.kind === 'read') text = `T${t} needs a shared lock to read ${op.key}, but ${h} holds an exclusive lock on it. ${level.name} never reads around a writer's lock, so T${t} waits.`;
        else if (op.kind === 'count') text = `T${t}'s scan needs a shared lock on every row, but ${h} holds an exclusive lock on ${r.on}. T${t} waits.`;
        else if (op.kind === 'write') text = `T${t} needs an exclusive lock on ${op.key}, but ${h} holds a ${r.mode} lock on it. T${t} waits until ${h} finishes.`;
        else text = `T${t}'s new row ${op.key} (balance ${op.set.value}) would match ${h}'s predicate lock on ${PREDICATE}, so the insert waits. This is exactly what stops phantoms.`;
        push(e, text);

        if (deadlocked(t)) {
            const victim = t, other = r.blocked[0];
            finish(victim, false);
            tx.wait = null;
            queue = queue.filter(o => o.t !== victim);
            const willRetry = scenario.retry && tx.attempt === 1;
            // The retry's operations queue up behind everything else; the
            // fresh transaction is created when the first of them runs.
            if (willRetry) queue.push(...plan.filter(o => o.t === victim).map(o => ({ ...o, retry: true })));
            const d = record({ t: victim, kind: 'deadlock', label: 'DEADLOCK — ABORTED', resumed: false, key: null });
            push(d, `Deadlock: T${victim} waits for T${other} while T${other} waits for T${victim}. Neither can ever proceed, so the database aborts T${victim}, discarding its work and releasing its locks.${willRetry ? ` The application catches the error and runs T${victim} again from the start.` : ''}`);
            wake();
        }
    };

    push(null, `${scenario.story} Isolation level: ${level.name}. ${level.rule}`);

    let guard = 0;
    while (guard++ < 200) {
        const idx = queue.findIndex(op => txns[op.t].status === 'active' || (op.retry && txns[op.t].status === 'aborted'));
        if (idx === -1) break;
        const [op] = queue.splice(idx, 1);
        if (txns[op.t].status === 'aborted') txns[op.t] = mkTxn(txns[op.t].attempt + 1);
        run(op);
    }

    /* A lost update: both committed transactions wrote the same row, and the
       result matches neither serial order. */
    const serial = [serialRun(plan, [1, 2]), serialRun(plan, [2, 1])];
    for (const id of Object.keys(rows)) {
        const writers = [1, 2].filter(t => txns[t].status === 'committed' && txns[t].wrote[id]);
        if (writers.length === 2 && !serial.some(s => s[id] === rows[id].committed)) anomalies.lost = true;
    }

    const finalState = Object.keys(rows).sort().map(id => `${id} = ${rows[id].committed}`).join(', ');
    const target = ANOMALIES.find(a => a.id === scenario.target);
    const happened = anomalies[scenario.target];
    let summary = `Final committed state: ${finalState}. `;
    if (scenario.target === 'lost') {
        const expect = serial[0].A;
        summary += happened
            ? `A should be ${expect}, but one transaction overwrote the other's committed change — a lost update.`
            : `A is ${rows.A.committed}, the same as running the two transactions one after the other.`;
    } else {
        summary += happened
            ? `The ${target.name.toLowerCase()} happened at ${level.name}.`
            : `No ${target.name.toLowerCase()} at ${level.name}${steps.some(s => s.event && s.event.kind === 'wait') ? ' — the anomaly was turned into waiting instead' : ' — this interleaving never gave it a chance'}.`;
    }
    push(null, summary, { final: true, anomalies: { ...anomalies } });
    return steps;
}

/* What every level allows on the default interleaving of every scenario —
   computed by running the engine, not typed in. */
const MATRIX = Object.fromEntries(SCENARIOS.map(sc => [sc.id, Object.fromEntries(LEVELS.map(l => {
    const steps = generateSteps(sc.plan, l.id, sc);
    return [l.id, steps[steps.length - 1].anomalies[sc.target]];
}))]));

/* The next step is a read: does it see the committed value, someone's
   uncommitted write, or block? The lock table, the uncommitted column and the
   timeline on screen decide it, together with the level's read rule. Every
   value the learner can see that the read might plausibly return becomes an
   option: the committed value, an uncommitted write, the value a blocked
   writer is waiting to write, and what this transaction read last time. When
   all of those agree and no lock is in the way there is nothing to decide,
   so there is no prompt. */
const predictFor = (step, next) => {
    if (!step || !next || !next.event) return null;
    const ev = next.event;
    const kind = ev.kind === 'wait' ? ev.opKind : ev.kind;
    if ((kind !== 'read' && kind !== 'count') || ev.resumed) return null;
    const level = levelOf(step.level);
    const t = ev.t;
    const me = step.txns.find(x => x.t === t);
    const other = step.txns.find(x => x.t !== t);
    const myEvents = step.timeline.filter(e => e.t === t && e.attempt === me.attempt);
    const blocked = other.status === 'waiting'
        ? [...step.timeline].reverse().find(e => e.t === other.t && e.kind === 'wait')
        : null;
    const otherX = (id) => step.locks.some(l => l.id === id && l.mode === 'X' && l.t !== t);
    const values = [];
    let contested;
    if (kind === 'read') {
        const row = step.rows.find(r => r.id === ev.key);
        if (!row) return null;
        if (row.committed !== null) values.push(row.committed);
        if (row.pending) values.push(row.pending.value);
        if (blocked && blocked.opKind === 'write' && blocked.key === ev.key) values.push(blocked.wouldWrite);
        const prev = [...myEvents].reverse().find(e => e.kind === 'read' && e.key === ev.key);
        if (prev) values.push(prev.result);
        contested = otherX(ev.key);
    } else {
        const over = (rows) => rows.filter(r => r.value !== null && r.value > RICH).length;
        const committed = step.rows.map(r => ({ id: r.id, value: r.committed }));
        values.push(over(committed));
        values.push(over(step.rows.map(r => ({ id: r.id, value: r.pending ? r.pending.value : r.committed }))));
        if (blocked && (blocked.opKind === 'write' || blocked.opKind === 'insert')) {
            const hypo = committed.filter(r => r.id !== blocked.key).concat([{ id: blocked.key, value: blocked.wouldWrite }]);
            values.push(over(hypo));
        }
        const prev = [...myEvents].reverse().find(e => e.kind === 'count');
        if (prev) values.push(prev.result);
        contested = step.rows.some(r => otherX(r.id));
    }
    const uniq = [...new Set(values)].sort((a, b) => a - b);
    if (uniq.length < 2 && !contested) return null;
    const noun = kind === 'read' ? 'Returns' : 'Counts';
    const options = [...uniq.map(v => `${noun} ${v}`), 'Waits for a lock'];
    const correct = ev.kind === 'wait' ? options.length - 1 : uniq.indexOf(ev.result);
    if (correct < 0) return null;
    const what = kind === 'read' ? `reads ${ev.key}` : `runs COUNT(*) WHERE ${PREDICATE}`;
    const prevResult = [...myEvents].reverse().find(e => e.kind === kind && (kind === 'count' || e.key === ev.key))?.result;
    let because;
    if (ev.kind === 'wait') because = `${ev.holders.map(x => `T${x}`).join(' and ')} holds an exclusive lock on what it reads. At ${level.name} a read must take a shared lock first, and the two are incompatible, so T${t} waits.`;
    else if (ev.dirty) because = `Read Uncommitted reads without any lock, so T${t} sees the uncommitted write.`;
    else if (prevResult !== undefined && prevResult === ev.result && blocked) because = `T${t} still holds the ${kind === 'count' && step.level === 'SER' ? 'predicate lock' : 'shared locks'} from its first ${kind === 'read' ? 'read' : 'count'}, so T${other.t}'s ${blocked.opKind} is stuck waiting and T${t} sees the same ${ev.result} as before.`;
    else if (prevResult !== undefined && prevResult !== ev.result) because = `${level.name} sees whatever is committed right now, and T${other.t} committed a change after T${t}'s earlier ${kind === 'read' ? 'read' : 'count'}.`;
    else if (step.level === 'RU') because = 'Read Uncommitted reads whatever is newest, and nothing uncommitted is in the way.';
    else because = `No other transaction holds an exclusive lock on what it reads, so the shared lock is granted and T${t} sees committed data.`;
    return {
        question: `T${t} now ${what} at ${level.name}. What happens?`,
        options,
        correct,
        because,
    };
};

const quizQuestions = [
    {
        question: 'Which anomaly can still happen at Read Committed?',
        options: ['Dirty reads', 'Non-repeatable reads', 'Dirty writes', 'None — Read Committed is fully isolated'],
        correct: 1,
        explanation: 'Read Committed only guarantees that each read sees committed data. Another transaction can commit a change between two reads of the same row, so the second read returns a different value.',
    },
    {
        question: 'With lock-based Repeatable Read, why can a phantom still appear?',
        options: [
            'Shared locks are dropped after each read',
            'Row locks cover only rows that already exist, so a newly inserted matching row is not locked',
            'Repeatable Read allows dirty reads',
            'COUNT(*) is answered from a cached value',
        ],
        correct: 1,
        explanation: 'Repeatable Read locks every row it has read, but an INSERT creates a row nobody could have locked. Serializable closes the gap with predicate (or index-range) locks that cover the WHERE clause itself.',
    },
    {
        question: 'Two transactions each read a balance and write back "value read + delta" at Read Committed. What can go wrong?',
        options: ['A deadlock is guaranteed', 'One update is silently lost', 'The second write is always rejected', 'Nothing — both deltas always apply'],
        correct: 1,
        explanation: 'Both read the same starting value, so the second write overwrites the first with a total that ignores it. Fix it with an atomic UPDATE ... SET balance = balance + 50, SELECT ... FOR UPDATE, or a stronger isolation level.',
    },
];

const TXN_COLOR = {
    1: { text: 'text-blue-300', chip: 'bg-blue-500/20 border-blue-400/60 text-blue-200', dot: 'bg-blue-400' },
    2: { text: 'text-orange-300', chip: 'bg-orange-500/20 border-orange-400/60 text-orange-200', dot: 'bg-orange-400' },
};

function EventChip({ e, latest }) {
    let tone = 'bg-slate-800 border-slate-600 text-slate-100';
    if (e.kind === 'write' || e.kind === 'insert') tone = 'bg-amber-500/15 border-amber-500/60 text-amber-200';
    if (e.kind === 'commit') tone = 'bg-green-500/15 border-green-500/60 text-green-300';
    if (e.kind === 'abort' || e.kind === 'deadlock') tone = 'bg-red-500/15 border-red-500/60 text-red-300';
    if (e.kind === 'wait') tone = 'bg-yellow-400/10 border-yellow-400/70 border-dashed text-yellow-200';
    if (e.dirty || e.changed) tone = 'bg-red-500/25 border-red-500 text-red-200';
    const showResult = (e.kind === 'read' || e.kind === 'count') && e.result !== undefined;
    return (
        <div className={`w-full min-w-0 flex items-center justify-between gap-2 px-2 py-1.5 rounded-md border font-mono text-[11px] transition-all duration-300 ${tone} ${latest ? 'ring-2 ring-blue-400/70 scale-[1.02]' : ''}`}>
            <span className="flex items-center gap-1 min-w-0 truncate">
                {e.kind === 'wait' && <Lock className="h-3 w-3 flex-shrink-0" />}
                {e.label}
                {e.attempt > 1 && <span className="text-[9px] text-slate-400">(retry)</span>}
            </span>
            {showResult && <span className="font-bold flex-shrink-0">→ {e.result}</span>}
            {e.kind === 'wait' && <span className="text-[10px]">waits</span>}
        </div>
    );
}

function TransactionIsolationLevelsPage() {
    const [scenarioId, setScenarioId] = useState('dirty');
    const [levelId, setLevelId] = useState('RU');
    const [plan, setPlan] = useState(SCENARIOS[0].plan);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1100);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const scenario = scenarioOf(scenarioId);

    useEffect(() => {
        setStepHistory(generateSteps(plan, levelId, scenarioOf(scenarioId)));
        setCurrentStep(0);
    }, [plan, levelId, scenarioId]);

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

    const chooseScenario = (id) => { setIsPlaying(false); setScenarioId(id); setPlan(scenarioOf(id).plan); };
    const chooseLevel = (id) => { setIsPlaying(false); setLevelId(id); };
    const shuffleTiming = () => { setIsPlaying(false); setPlan(interleave(scenario.plan)); };
    const reset = () => { setIsPlaying(false); setCurrentStep(0); };

    const step = stepHistory[currentStep];
    const isDefaultPlan = plan === scenario.plan;

    const handleQuizAnswer = (idx) => {
        if (quizState.answered) return;
        const correct = idx === quizQuestions[quizState.current].correct;
        setQuizState(s => ({ ...s, selected: idx, answered: true, score: correct ? s.score + 1 : s.score }));
    };
    const nextQuestion = () => {
        if (quizState.current + 1 >= quizQuestions.length) setQuizState(s => ({ ...s, complete: true }));
        else setQuizState(s => ({ ...s, current: s.current + 1, selected: null, answered: false }));
    };

    const codeExample = `-- Choose the level per transaction (PostgreSQL / MySQL syntax)
BEGIN;
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
SELECT balance FROM accounts WHERE id = 'A';
-- ... the same SELECT later in this transaction sees the same value
COMMIT;

-- The lost update needs no stronger level if the write is atomic:
UPDATE accounts SET balance = balance + 50 WHERE id = 'A';

-- ...or if the read already takes the write lock:
BEGIN;
SELECT balance FROM accounts WHERE id = 'A' FOR UPDATE;
UPDATE accounts SET balance = 150 WHERE id = 'A';
COMMIT;`;

    const lastIdx = step ? step.timeline.length - 1 : -1;

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
                            <Layers className="h-10 w-10" />Transaction Isolation Levels
                        </h1>
                        <p className="text-xl text-blue-100 mb-6 max-w-3xl mx-auto">
                            Two transactions share one table. Each isolation level is a different promise about what one may see of the other — watch the anomalies appear, and the locks that make them disappear.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">4 levels</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">4 anomalies</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Lock-based model</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6 mb-6">
                            {/* Scenario + level pickers */}
                            <div className="space-y-3 mb-5">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs uppercase tracking-wide text-slate-500 w-20">Scenario</span>
                                    {SCENARIOS.map(sc => (
                                        <button key={sc.id} onClick={() => chooseScenario(sc.id)}
                                            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${sc.id === scenarioId ? 'bg-blue-500/20 border-blue-400 text-blue-200' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                                            {sc.name}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs uppercase tracking-wide text-slate-500 w-20">Level</span>
                                    {LEVELS.map(l => (
                                        <button key={l.id} onClick={() => chooseLevel(l.id)}
                                            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${l.id === levelId ? 'bg-teal-500/20 border-teal-400 text-teal-200' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                                            {l.name}
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
                                <button onClick={shuffleTiming} title="Same operations, different interleaving"
                                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium">
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
                                    <span className="text-sm text-slate-500">{isDefaultPlan ? 'Textbook interleaving' : 'Shuffled interleaving'}</span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-2">
                                    <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: `${((currentStep + 1) / Math.max(stepHistory.length, 1)) * 100}%` }} />
                                </div>
                            </div>

                            {step && (
                                <div className="grid grid-cols-1 md:grid-cols-5 lg:grid-cols-1 xl:grid-cols-5 gap-4 mb-5">
                                    {/* Timeline: time flows down, one lane per transaction */}
                                    <div className="md:col-span-3 lg:col-span-1 xl:col-span-3 min-w-0 bg-slate-800/50 rounded-lg border border-slate-700/60 p-3">
                                        <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-xs">
                                            <div />
                                            {step.txns.map(tx => (
                                                <div key={tx.t} className="flex items-center justify-between pb-2 border-b border-slate-700">
                                                    <span className={`font-bold ${TXN_COLOR[tx.t].text}`}>T{tx.t}{tx.attempt > 1 ? ' (retry)' : ''}</span>
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${tx.status === 'committed' ? 'bg-green-500/20 text-green-300' : tx.status === 'aborted' ? 'bg-red-500/20 text-red-300' : tx.status === 'waiting' ? 'bg-yellow-400/20 text-yellow-200' : 'bg-slate-700 text-slate-300'}`}>{tx.status}</span>
                                                </div>
                                            ))}
                                            {step.timeline.map((e, i) => (
                                                <React.Fragment key={`e${i}`}>
                                                    <div className="text-slate-600 font-mono text-right pt-1.5">{i + 1}</div>
                                                    {[1, 2].map(t => (
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
                                                    {[1, 2].map(t => (
                                                        <div key={t} className="min-h-[2rem] flex items-center">
                                                            {op.t === t && (
                                                                <div className="w-full min-w-0 truncate px-2 py-1.5 rounded-md border border-dashed border-slate-600 text-slate-500 font-mono text-[11px]">{op.label}</div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Shared state */}
                                    <div className="md:col-span-2 lg:col-span-1 xl:col-span-2 space-y-3">
                                        <div className="bg-slate-800/50 rounded-lg border border-slate-700/60 p-3">
                                            <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">accounts</div>
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="text-slate-500 text-left">
                                                        <th className="font-medium pb-1">id</th>
                                                        <th className="font-medium pb-1">committed</th>
                                                        <th className="font-medium pb-1">uncommitted</th>
                                                        <th className="font-medium pb-1">locks</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {step.rows.map(r => {
                                                        const rowLocks = step.locks.filter(l => l.id === r.id);
                                                        const touched = step.event && step.event.key === r.id;
                                                        return (
                                                            <tr key={r.id} className={`border-t border-slate-700/60 transition-colors ${touched ? 'bg-blue-500/10' : ''}`}>
                                                                <td className="py-1.5 font-mono font-bold text-slate-200">{r.id}</td>
                                                                <td className="py-1.5 font-mono text-slate-200">{r.committed ?? '—'}</td>
                                                                <td className="py-1.5 font-mono">
                                                                    {r.pending
                                                                        ? <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-dashed border-amber-500/60 text-amber-200">{r.pending.value} <span className={TXN_COLOR[r.pending.t].text}>T{r.pending.t}</span></span>
                                                                        : <span className="text-slate-600">—</span>}
                                                                </td>
                                                                <td className="py-1.5">
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {rowLocks.map((l, i) => (
                                                                            <span key={i} className={`px-1.5 py-0.5 rounded font-mono text-[10px] border ${l.mode === 'X' ? 'bg-red-500/15 border-red-500/50 text-red-300' : 'bg-sky-500/15 border-sky-500/50 text-sky-300'}`}>
                                                                                {l.mode}:T{l.t}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                            {step.preds.length > 0 && (
                                                <div className="mt-2 pt-2 border-t border-slate-700/60 text-[11px] text-purple-300">
                                                    {step.preds.map((p, i) => <div key={i}>Predicate lock T{p.t}: {p.label}</div>)}
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            {step.txns.map(tx => (
                                                <div key={tx.t} className="bg-slate-800/50 rounded-lg border border-slate-700/60 p-2">
                                                    <div className={`text-xs font-bold mb-1 ${TXN_COLOR[tx.t].text}`}>T{tx.t} has read</div>
                                                    {Object.keys(tx.vars).length === 0
                                                        ? <div className="text-[11px] text-slate-600">nothing yet</div>
                                                        : Object.entries(tx.vars).map(([k, v]) => <div key={k} className="font-mono text-[11px] text-slate-300">{k} = {v}</div>)}
                                                </div>
                                            ))}
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            {ANOMALIES.map(a => {
                                                const seen = step.anomalies[a.id];
                                                const isTarget = a.id === scenario.target;
                                                let tone = 'border-slate-700 text-slate-500';
                                                if (seen) tone = 'border-red-500 bg-red-500/15 text-red-300';
                                                else if (step.final && isTarget) tone = 'border-green-500 bg-green-500/10 text-green-300';
                                                return (
                                                    <div key={a.id} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md border text-[11px] transition-colors ${tone} ${isTarget ? 'font-semibold' : ''}`}>
                                                        {seen ? <AlertTriangle className="h-3 w-3 flex-shrink-0" /> : step.final && isTarget ? <CheckCircle className="h-3 w-3 flex-shrink-0" /> : <span className="h-3 w-3 flex-shrink-0" />}
                                                        {a.name}
                                                    </div>
                                                );
                                            })}
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
                                <h3 className="font-bold text-white">What Each Level Allows</h3>
                            </div>
                            <table className="w-full text-[11px]">
                                <thead>
                                    <tr className="text-slate-500">
                                        <th className="text-left font-medium pb-2">Level</th>
                                        {ANOMALIES.map(a => <th key={a.id} className={`font-medium pb-2 px-1 ${a.id === scenario.target ? 'text-blue-300' : ''}`}>{a.name}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {LEVELS.map(l => (
                                        <tr key={l.id} className={`border-t border-slate-800 ${l.id === levelId ? 'bg-teal-500/10' : ''}`}>
                                            <td className={`py-1.5 pr-1 ${l.id === levelId ? 'text-teal-200 font-semibold' : 'text-slate-300'}`}>{l.name}</td>
                                            {ANOMALIES.map(a => {
                                                const possible = MATRIX[a.id][l.id];
                                                const here = l.id === levelId && a.id === scenario.target;
                                                return (
                                                    <td key={a.id} className="py-1.5 px-1 text-center">
                                                        <span className={`inline-block px-1.5 py-0.5 rounded ${possible ? 'bg-red-500/15 text-red-300' : 'bg-green-500/15 text-green-300'} ${here ? 'ring-1 ring-blue-400' : ''}`}>
                                                            {possible ? 'yes' : 'no'}
                                                        </span>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                                Every cell is produced by running this page’s engine on that scenario. Real engines differ in places:
                                PostgreSQL treats Read Uncommitted as Read Committed and reaches the stronger levels with MVCC snapshots instead of read locks.
                            </p>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">How Reads Are Protected</h3>
                            <ul className="space-y-3 text-sm">
                                {LEVELS.map(l => (
                                    <li key={l.id} className={`rounded-lg p-2 border transition-colors ${l.id === levelId ? 'border-teal-500/50 bg-teal-500/10' : 'border-transparent'}`}>
                                        <div className={`font-semibold ${l.id === levelId ? 'text-teal-200' : 'text-slate-300'}`}>{l.name}</div>
                                        <div className="text-slate-400 text-xs leading-relaxed">{l.rule}</div>
                                    </li>
                                ))}
                            </ul>
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
                                <Code2 className="h-5 w-5" />{showCode ? 'Hide' : 'Show'} SQL Example
                            </button>
                            {showCode && <div className="mt-4"><CodeBlock code={codeExample} language="sql" /></div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default TransactionIsolationLevelsPage;
