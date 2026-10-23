"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Shuffle, Info, Code2, History, Clock, CheckCircle, XCircle, Trash2, Camera } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* Workloads in shorthand: B1 begin T1, R2(A) T2 reads A, U1(A=150) update,
   D3(A) delete, I1(C=300) insert, C1 commit, A1 abort, V a VACUUM pass.
   T0 is the transaction that loaded the table before any of them started. */
const parsePlan = (text) => text.split(' ').map(tok => {
    if (tok === 'V') return { t: 0, kind: 'vacuum' };
    const m = /^([BRUDICA])(\d)(?:\((\w)(?:=(\d+))?\))?$/.exec(tok);
    const kind = { B: 'begin', R: 'read', U: 'update', D: 'delete', I: 'insert', C: 'commit', A: 'abort' }[m[1]];
    return { t: Number(m[2]), kind, row: m[3] ?? null, value: m[4] !== undefined ? Number(m[4]) : null };
});

const INITIAL = [{ id: 'A', value: 100 }, { id: 'B', value: 200 }];

const PRESETS = [
    {
        id: 'readers', name: 'Readers never block',
        blurb: 'T1 updates A while T2 is reading it. Nobody waits: T1 writes a new version and T2 keeps reading the old one.',
        plan: parsePlan('B1 B2 U1(A=150) R2(A) C1 R2(A) B3 R3(A) V C2 V C3'),
    },
    {
        id: 'snapshot', name: 'A stable snapshot',
        blurb: 'T2 reads A, then T1 changes A, inserts C and commits. What does T2 see the second time?',
        plan: parsePlan('B1 B2 R2(A) U1(A=150) I1(C=300) C1 R2(A) R2(C) C2'),
    },
    {
        id: 'conflict', name: 'First committer wins',
        blurb: 'T1 and T2 both change A. T1 commits first. What happens to T2’s update?',
        plan: parsePlan('B1 B2 R2(A) U1(A=150) C1 U2(A=70) C2'),
    },
    {
        id: 'garbage', name: 'Aborts, deletes, garbage',
        blurb: 'T1 updates B and aborts; T3 deletes A and commits while T2 is still reading. Which versions can VACUUM throw away, and when?',
        plan: parsePlan('B1 U1(B=250) B2 R2(B) A1 R2(B) V B3 D3(A) C3 R2(A) C2 V'),
    },
];

const opLabel = (op) => {
    if (op.kind === 'vacuum') return 'VACUUM';
    if (op.kind === 'begin') return `BEGIN T${op.t}`;
    if (op.kind === 'read') return `T${op.t}: READ ${op.row}`;
    if (op.kind === 'update') return `T${op.t}: UPDATE ${op.row} = ${op.value}`;
    if (op.kind === 'delete') return `T${op.t}: DELETE ${op.row}`;
    if (op.kind === 'insert') return `T${op.t}: INSERT ${op.row} = ${op.value}`;
    return `${op.kind === 'commit' ? 'COMMIT' : 'ABORT'} T${op.t}`;
};

/** Random interleaving that keeps each transaction's (and VACUUM's) own order. */
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

/** Is version v visible to transaction `me` reading with snapshot `snap`
    (the set of transactions that had committed when it was taken)? */
function judge(v, me, snap, clog) {
    if (v.xmin !== me && !snap.includes(v.xmin)) {
        const st = clog[v.xmin];
        return {
            visible: false,
            reason: st === 'aborted' ? `T${v.xmin} aborted` : st === 'committed' ? `T${v.xmin} committed after the snapshot` : `T${v.xmin} has not committed`,
        };
    }
    if (v.xmax !== null && (v.xmax === me || snap.includes(v.xmax))) {
        return { visible: false, reason: v.xmax === me ? 'replaced by its own write' : `deleted by T${v.xmax} before the snapshot` };
    }
    let reason = v.xmin === me ? 'its own write' : v.xmin === 0 ? 'loaded before the snapshot' : `T${v.xmin} committed before the snapshot`;
    if (v.xmax !== null) reason += clog[v.xmax] === 'aborted' ? `; T${v.xmax}’s change aborted` : `; T${v.xmax}’s change is not in the snapshot`;
    return { visible: true, reason };
}

function generateSteps(plan, level, blurb = '') {
    const rc = level === 'RC';
    const ids = [...new Set(plan.map(o => o.t).filter(t => t > 0))].sort((a, b) => a - b);
    const clog = { 0: 'committed' };
    const rows = {};
    INITIAL.forEach(r => { rows[r.id] = { next: 2, versions: [{ vid: `${r.id}.v1`, value: r.value, xmin: 0, xmax: null }] }; });
    const txns = Object.fromEntries(ids.map(t => [t, { status: 'idle', snap: null }]));
    const log = [];
    const steps = [];
    const committedSet = () => Object.keys(clog).filter(x => clog[x] === 'committed').map(Number).sort((a, b) => a - b);

    const snap = () => ({
        rows: Object.keys(rows).sort().map(id => ({ id, versions: rows[id].versions.map(v => ({ ...v })) })).filter(r => r.versions.length),
        txns: ids.map(t => ({ t, status: txns[t].status, snap: txns[t].snap ? [...txns[t].snap] : null })),
        clog: { ...clog },
        log: log.map(e => ({ ...e })),
    });
    const push = (event, explanation, extra = {}) => steps.push({ level, event, explanation, garbage: [], ...snap(), ...extra, remaining: queueLeft.map(opLabel) });
    let queueLeft = [...plan];

    const visibleVersion = (rowId, me, s) => {
        const chain = rows[rowId] ? rows[rowId].versions : [];
        return chain.find(v => judge(v, me, s, clog).visible) ?? null;
    };
    const snapText = (s) => `{${s.map(x => `T${x}`).join(', ')}}`;
    const abortMe = (t, why) => {
        clog[t] = 'aborted';
        txns[t].status = 'aborted';
        return why;
    };
    const removable = (v) => {
        if (clog[v.xmin] === 'aborted') return true;
        if (v.xmax === null || clog[v.xmax] !== 'committed') return false;
        // Read Committed snapshots last one statement, so between statements
        // they pin nothing; a snapshot-isolation transaction's snapshot lives
        // until it ends.
        return rc || ids.every(t => txns[t].status !== 'active' || txns[t].snap.includes(v.xmax));
    };
    const keptBecause = (v) => {
        if (v.xmax === null) return null;
        if (clog[v.xmax] !== 'committed') return `T${v.xmax} has not committed its change`;
        const pinning = ids.filter(t => txns[t].status === 'active' && !txns[t].snap.includes(v.xmax));
        return pinning.length ? `${pinning.map(t => `T${t}`).join(', ')} can still see it` : null;
    };

    push(null, `${blurb} Every row is a chain of versions stamped with xmin (the transaction that created it) and xmax (the one that replaced or deleted it). ${rc ? 'Read Committed: every statement takes a fresh snapshot.' : 'Snapshot isolation: each transaction takes one snapshot when it begins and reads from it until the end.'}`.trim());

    while (queueLeft.length) {
        const op = queueLeft.shift();
        const t = op.t;
        if (op.kind !== 'vacuum' && op.kind !== 'begin' && txns[t].status !== 'active') {
            continue;   // its transaction already aborted
        }
        if (op.kind === 'begin') {
            txns[t].status = 'active';
            txns[t].snap = committedSet();
            clog[t] = 'in progress';
            log.push({ t, label: opLabel(op), result: '' });
            push({ kind: 'begin', t }, `T${t} begins and takes a snapshot: it will see the work of ${snapText(txns[t].snap)} — every transaction committed right now — and nothing that commits later${rc ? ' (until its next statement takes a new snapshot)' : ''}.`);
            continue;
        }
        if (op.kind === 'commit' || op.kind === 'abort') {
            const mine = Object.values(rows).flatMap(r => r.versions).filter(v => v.xmin === t || v.xmax === t);
            clog[t] = op.kind === 'commit' ? 'committed' : 'aborted';
            txns[t].status = op.kind === 'commit' ? 'committed' : 'aborted';
            log.push({ t, label: opLabel(op), result: '' });
            push({ kind: op.kind, t }, op.kind === 'commit'
                ? `T${t} commits. Nothing in the table is rewritten: the commit log simply marks T${t} committed, and every snapshot taken from now on sees its versions.${mine.length ? '' : ' It changed nothing.'}`
                : `T${t} aborts. Again nothing is rewritten: the commit log marks T${t} aborted, which makes every version it created invisible to everyone${mine.some(v => v.xmin === t) ? ' — they are garbage now' : ''}.`);
            continue;
        }
        if (op.kind === 'vacuum') {
            const all = Object.values(rows).flatMap(r => r.versions);
            const dead = all.filter(removable).map(v => v.vid);
            const kept = all.filter(v => !dead.includes(v.vid) && v.xmax !== null && clog[v.xmax] === 'committed').map(v => `${v.vid} (${keptBecause(v)})`);
            push({ kind: 'vacuum-scan', t: 0 }, dead.length
                ? `VACUUM looks for versions no snapshot can ever see again: ${dead.join(', ')}.${kept.length ? ` It must keep ${kept.join(', ')}.` : ''}`
                : `VACUUM finds nothing to remove.${kept.length ? ` ${kept.join(', ')} — an old version stays as long as some snapshot might read it.` : ''}`, { garbage: dead });
            if (dead.length) {
                for (const id of Object.keys(rows)) rows[id].versions = rows[id].versions.filter(v => !dead.includes(v.vid));
                log.push({ t: 0, label: 'VACUUM', result: `removed ${dead.length}` });
                push({ kind: 'vacuum-sweep', t: 0 }, `${dead.join(', ')} ${dead.length > 1 ? 'are' : 'is'} gone and the space can be reused. Without VACUUM, every update would leave a dead version behind forever.`);
            } else log.push({ t: 0, label: 'VACUUM', result: 'nothing' });
            continue;
        }

        // Statements. Read Committed refreshes the snapshot every time.
        if (rc) txns[t].snap = committedSet();
        const s = txns[t].snap;
        if (op.kind === 'read') {
            const chain = rows[op.row] ? rows[op.row].versions : [];
            const checks = chain.map(v => ({ vid: v.vid, ...judge(v, t, s, clog) }));
            const hit = chain.find(v => judge(v, t, s, clog).visible) ?? null;
            const uncommittedOther = chain.some(v => clog[v.xmin] === 'in progress' && v.xmin !== t);
            log.push({ t, label: opLabel(op), result: hit ? String(hit.value) : 'no row' });
            const walk = checks.map(ch => `${ch.vid} ${ch.visible ? 'visible' : 'skipped'} (${ch.reason})`).join('; ');
            push({ kind: 'read', t, row: op.row, checks, resultVid: hit ? hit.vid : null, resultValue: hit ? hit.value : null },
                `T${t} reads ${op.row} with snapshot ${snapText(s)} and walks the chain: ${walk || 'no versions at all'}. Result: ${hit ? hit.value : 'no such row'}.${uncommittedOther ? ' Another transaction’s uncommitted version sat right there and nobody waited for anybody.' : ''}`);
            continue;
        }
        if (op.kind === 'insert') {
            const chain = rows[op.row] ? rows[op.row].versions : [];
            const live = chain.find(v => clog[v.xmin] !== 'aborted' && (v.xmax === null || clog[v.xmax] !== 'committed'));
            if (live) {
                log.push({ t, label: opLabel(op), result: 'aborted' });
                push({ kind: 'insert', t, row: op.row, outcome: 'abort' }, abortMe(t, `${op.row} already exists (${live.vid}, by T${live.xmin}), so the insert hits a duplicate key and T${t} aborts.`));
                continue;
            }
            if (!rows[op.row]) rows[op.row] = { next: 1, versions: [] };
            const vid = `${op.row}.v${rows[op.row].next++}`;
            rows[op.row].versions.push({ vid, value: op.value, xmin: t, xmax: null });
            log.push({ t, label: opLabel(op), result: vid });
            push({ kind: 'insert', t, row: op.row, outcome: 'ok', vid }, `T${t} inserts ${op.row} = ${op.value} as ${vid} with xmin = T${t}. Until T${t} commits, no other snapshot can see it.`);
            continue;
        }
        // update / delete
        const target = visibleVersion(op.row, t, s);
        const verb = op.kind === 'update' ? 'update' : 'delete';
        if (!target) {
            log.push({ t, label: opLabel(op), result: '0 rows' });
            push({ kind: op.kind, t, row: op.row, outcome: 'none' }, `T${t}'s snapshot has no visible version of ${op.row}, so the ${verb} matches nothing: 0 rows.`);
            continue;
        }
        if (target.xmax !== null && target.xmax !== t && clog[target.xmax] !== 'aborted') {
            const other = target.xmax;
            log.push({ t, label: opLabel(op), result: 'aborted' });
            const why = clog[other] === 'committed'
                ? `${target.vid} is the version T${t}'s snapshot sees, but T${other} replaced it and committed after that snapshot. Snapshot isolation refuses to overwrite a change it never saw — "could not serialize access due to concurrent update" — so T${t} aborts. First committer wins.`
                : `T${other} is changing ${op.row} right now (it set xmax on ${target.vid}). A database like PostgreSQL would make T${t} wait for T${other}; this one aborts T${t} at once rather than lose an update.`;
            push({ kind: op.kind, t, row: op.row, outcome: 'abort', target: target.vid }, abortMe(t, why));
            continue;
        }
        target.xmax = t;
        let text;
        if (op.kind === 'update') {
            const vid = `${op.row}.v${rows[op.row].next++}`;
            rows[op.row].versions.push({ vid, value: op.value, xmin: t, xmax: null });
            log.push({ t, label: opLabel(op), result: vid });
            text = `T${t} does not overwrite ${target.vid}. It stamps it with xmax = T${t} and appends a new version ${vid} = ${op.value} with xmin = T${t}. Snapshots that cannot see T${t} keep reading ${target.vid}.`;
            push({ kind: 'update', t, row: op.row, outcome: 'ok', target: target.vid, vid }, text);
        } else {
            log.push({ t, label: opLabel(op), result: 'deleted' });
            text = `A delete writes no new version: T${t} only stamps ${target.vid} with xmax = T${t}. Snapshots that cannot see T${t} still find the row.`;
            push({ kind: 'delete', t, row: op.row, outcome: 'ok', target: target.vid }, text);
        }
    }
    push({ kind: 'done', t: 0 }, `Done. ${Object.keys(rows).sort().map(id => {
        const v = visibleVersion(id, -1, committedSet());
        return v ? `${id} = ${v.value}` : null;
    }).filter(Boolean).join(', ')} is what a new transaction would see now, with ${Object.values(rows).reduce((n, r) => n + r.versions.length, 0)} versions still stored.`, { final: true });
    return steps;
}

/* Two decisions the screen settles: which version of the chain this
   snapshot sees, and whether an update or delete goes through. */
const predictFor = (step, next) => {
    if (!step || !next || !next.event) return null;
    const ev = next.event;
    const tx = step.txns.find(x => x.t === ev.t);
    const rcNote = step.level === 'RC' ? ' (Read Committed takes a fresh snapshot for this statement.)' : '';
    if (ev.kind === 'read') {
        const row = step.rows.find(r => r.id === ev.row);
        const chain = row ? row.versions : [];
        if (chain.length === 0) return null;
        if (chain.length === 1 && chain[0].xmin === 0 && chain[0].xmax === null) return null;
        // Older snapshots usually see older versions, so listing the chain
        // oldest-first would put the answer first most of the time. Rotate it
        // by how far the workload has run instead.
        const shift = step.log.length % chain.length;
        const order = [...chain.slice(shift), ...chain.slice(0, shift)];
        const options = [...order.map(v => `${v.vid} = ${v.value}`), 'No visible version'];
        const correct = ev.resultVid ? order.findIndex(v => v.vid === ev.resultVid) : options.length - 1;
        if (correct < 0) return null;
        const hit = ev.checks.find(ch => ch.vid === ev.resultVid);
        return {
            question: `T${ev.t} reads ${ev.row}. Which version does its snapshot see?${rcNote}`,
            options,
            correct,
            because: hit ? `${ev.resultVid}: ${hit.reason}. Every other version is either too new for the snapshot or already replaced in it.` : `Every version is either too new for T${ev.t}'s snapshot or already deleted in it.`,
        };
    }
    if ((ev.kind === 'update' || ev.kind === 'delete') && tx && ev.outcome !== 'none') {
        // Only ask when another transaction has touched the row; otherwise
        // there is nothing to weigh up.
        const chain = step.rows.find(r => r.id === ev.row)?.versions ?? [];
        const contested = chain.some(v => (v.xmin !== 0 && v.xmin !== ev.t) || (v.xmax !== null && v.xmax !== ev.t));
        if (!contested) return null;
        const options = [ev.kind === 'update' ? 'Writes a new version' : 'Stamps xmax on the row', 'T' + ev.t + ' aborts'];
        return {
            question: `T${ev.t} wants to ${ev.kind} ${ev.row}. What happens?${rcNote}`,
            options,
            correct: ev.outcome === 'ok' ? 0 : 1,
            because: ev.outcome === 'ok'
                ? `The version T${ev.t} sees has no live xmax from anyone else, so nobody else has changed it.`
                : `The version T${ev.t} sees already carries another transaction’s xmax — someone changed the row after T${ev.t}'s snapshot, or is changing it now.`,
        };
    }
    return null;
};

const quizQuestions = [
    {
        question: 'Under MVCC, T1 has an uncommitted update on row A. What happens when T2 reads A?',
        options: ['T2 waits for T1 to commit', 'T2 reads T1’s uncommitted value', 'T2 reads the older committed version immediately', 'T2 aborts'],
        correct: 2,
        explanation: 'The update created a new version instead of overwriting the old one. T2’s snapshot cannot see T1’s version, so it reads the previous committed one — without taking a lock or waiting.',
    },
    {
        question: 'When can VACUUM remove an old row version?',
        options: [
            'As soon as a newer version exists',
            'When the transaction that replaced it has committed and no active snapshot can still see the old version',
            'Only when the table is dropped',
            'When the version is more than one hour old',
        ],
        correct: 1,
        explanation: 'A long-running transaction with an old snapshot pins every version it might read. This is why one forgotten open transaction can make a PostgreSQL table bloat.',
    },
    {
        question: 'Under snapshot isolation, T1 and T2 both update row A and T1 commits first. What happens to T2?',
        options: ['Its update overwrites T1’s silently', 'It aborts with a serialization error', 'It waits forever', 'It merges both updates'],
        correct: 1,
        explanation: 'First committer wins: T2 would overwrite a change its snapshot never saw, so it is aborted and must retry. Read Committed instead re-reads the newest version and proceeds — which is how lost updates sneak in.',
    },
];

const TXN_TEXT = { 1: 'text-blue-300', 2: 'text-orange-300', 3: 'text-violet-300' };

function VersionBox({ v, step, check, garbage }) {
    const creator = step.clog[v.xmin];
    const deleter = v.xmax !== null ? step.clog[v.xmax] : null;
    let tone = 'border-slate-600 bg-slate-800';
    if (creator === 'in progress') tone = 'border-amber-500/70 border-dashed bg-amber-500/10';
    if (creator === 'aborted') tone = 'border-red-500/50 bg-red-950/40 opacity-70';
    if (deleter === 'committed' && creator === 'committed') tone = 'border-slate-700 bg-slate-900 opacity-80';
    if (garbage) tone = 'border-red-500 bg-red-500/15';
    const ring = check ? (check.visible ? 'ring-2 ring-green-400' : 'ring-1 ring-slate-600') : '';
    return (
        <div className={`relative w-32 flex-shrink-0 rounded-lg border-2 p-2 transition-all duration-500 ${tone} ${ring}`}
            style={garbage ? { backgroundImage: 'repeating-linear-gradient(45deg, rgba(239,68,68,0.15) 0 6px, transparent 6px 12px)' } : undefined}>
            <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-slate-400">{v.vid}</span>
                {check && (check.visible ? <CheckCircle className="h-3.5 w-3.5 text-green-400" /> : <XCircle className="h-3.5 w-3.5 text-slate-500" />)}
                {garbage && <Trash2 className="h-3.5 w-3.5 text-red-400" />}
            </div>
            <div className="text-xl font-bold text-slate-100 leading-tight">{v.value}</div>
            <div className="mt-1 font-mono text-[10px] text-slate-400 space-y-0.5">
                <div>xmin <span className={v.xmin === 0 ? 'text-slate-300' : TXN_TEXT[v.xmin]}>T{v.xmin}</span>{creator !== 'committed' && <span className={creator === 'aborted' ? 'text-red-400' : 'text-amber-300'}> · {creator === 'aborted' ? 'aborted' : 'uncommitted'}</span>}</div>
                <div>xmax {v.xmax === null ? <span className="text-slate-500">∞</span> : <span className={`${TXN_TEXT[v.xmax]} ${deleter === 'aborted' ? 'line-through opacity-60' : ''}`}>T{v.xmax}</span>}</div>
            </div>
            {check && <div className={`mt-1 text-[10px] leading-snug ${check.visible ? 'text-green-300' : 'text-slate-500'}`}>{check.reason}</div>}
        </div>
    );
}

function MVCCPage() {
    const [presetId, setPresetId] = useState('readers');
    const [level, setLevel] = useState('SI');
    const [plan, setPlan] = useState(PRESETS[0].plan);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1200);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const preset = PRESETS.find(p => p.id === presetId);

    useEffect(() => {
        setStepHistory(generateSteps(plan, level, PRESETS.find(p => p.id === presetId).blurb));
        setCurrentStep(0);
    }, [plan, level, presetId]);

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
    const ev = step?.event;
    const checkFor = (vid) => (ev && ev.kind === 'read' && !predict.hideExplanation ? ev.checks.find(c => c.vid === vid) : null);

    const handleQuizAnswer = (idx) => {
        if (quizState.answered) return;
        const correct = idx === quizQuestions[quizState.current].correct;
        setQuizState(s => ({ ...s, selected: idx, answered: true, score: correct ? s.score + 1 : s.score }));
    };
    const nextQuestion = () => {
        if (quizState.current + 1 >= quizQuestions.length) setQuizState(s => ({ ...s, complete: true }));
        else setQuizState(s => ({ ...s, current: s.current + 1, selected: null, answered: false }));
    };

    const codeExample = `-- PostgreSQL exposes the version stamps as hidden columns
SELECT xmin, xmax, id, balance FROM accounts;

-- Session 1
BEGIN ISOLATION LEVEL REPEATABLE READ;      -- snapshot isolation
SELECT balance FROM accounts WHERE id = 'A';  -- 100

    -- Session 2 (autocommit)
    UPDATE accounts SET balance = 150 WHERE id = 'A';

-- Session 1 again: same snapshot, same answer
SELECT balance FROM accounts WHERE id = 'A';  -- still 100
UPDATE accounts SET balance = 70 WHERE id = 'A';
-- ERROR: could not serialize access due to concurrent update
ROLLBACK;

-- Reclaim versions that no snapshot can see any more
VACUUM accounts;`;

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
                            <History className="h-10 w-10" />MVCC
                        </h1>
                        <p className="text-xl text-blue-100 mb-6 max-w-3xl mx-auto">
                            Multi-version concurrency control never overwrites a row. Every change adds a version, every transaction reads from its own snapshot, and readers and writers stop waiting for each other.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Readers never block writers</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Snapshot per transaction</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Old versions need VACUUM</div>
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
                                    <span className="text-xs uppercase tracking-wide text-slate-500 w-20">Snapshots</span>
                                    {[['SI', 'One per transaction (snapshot isolation)'], ['RC', 'One per statement (read committed)']].map(([id, label]) => (
                                        <button key={id} onClick={() => { setIsPlaying(false); setLevel(id); }}
                                            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${id === level ? 'bg-teal-500/20 border-teal-400 text-teal-200' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
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
                                    <span className="text-sm text-slate-500 font-mono">{step?.remaining[0] ? `next: ${step.remaining[0]}` : ''}</span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-2">
                                    <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: `${((currentStep + 1) / Math.max(stepHistory.length, 1)) * 100}%` }} />
                                </div>
                            </div>

                            {step && (
                                <div className="space-y-4 mb-5">
                                    {/* Transactions and their snapshots */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        {step.txns.map(tx => {
                                            const isActor = ev && ev.t === tx.t;
                                            return (
                                                <div key={tx.t} className={`rounded-lg border p-3 transition-colors ${isActor ? 'border-blue-400 bg-blue-500/10' : 'border-slate-700/60 bg-slate-800/50'}`}>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className={`font-bold ${TXN_TEXT[tx.t]}`}>T{tx.t}</span>
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${tx.status === 'committed' ? 'bg-green-500/20 text-green-300' : tx.status === 'aborted' ? 'bg-red-500/20 text-red-300' : tx.status === 'active' ? 'bg-sky-500/20 text-sky-300' : 'bg-slate-700 text-slate-400'}`}>
                                                            {tx.status === 'idle' ? 'not started' : tx.status}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-start gap-1.5 text-[11px] text-slate-400">
                                                        <Camera className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-slate-500" />
                                                        {tx.snap
                                                            ? <span>snapshot sees <span className="font-mono text-slate-200">{tx.snap.map(x => `T${x}`).join(', ')}</span>{step.level === 'RC' ? ' (last statement)' : ''}</span>
                                                            : <span>no snapshot yet</span>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Version chains */}
                                    <div className="bg-slate-800/50 rounded-lg border border-slate-700/60 p-4 space-y-4">
                                        <div className="text-xs uppercase tracking-wide text-slate-500">Version chains (oldest → newest)</div>
                                        {step.rows.length === 0 && <div className="text-sm text-slate-500">The table is empty.</div>}
                                        {step.rows.map(r => (
                                            <div key={r.id} className={`flex items-stretch gap-2 overflow-x-auto pb-1 ${ev && ev.row === r.id ? '' : ''}`}>
                                                <div className={`w-10 flex-shrink-0 flex items-center justify-center rounded-lg font-mono font-bold text-lg ${ev && ev.row === r.id ? 'bg-blue-500/20 text-blue-200' : 'bg-slate-900 text-slate-300'}`}>{r.id}</div>
                                                {r.versions.map((v, k) => (
                                                    <React.Fragment key={v.vid}>
                                                        {k > 0 && <div className="flex items-center text-slate-600 flex-shrink-0">→</div>}
                                                        <VersionBox v={v} step={step} check={checkFor(v.vid)} garbage={step.garbage.includes(v.vid)} />
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="bg-slate-800/50 rounded-lg border border-slate-700/60 p-3">
                                            <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Commit log</div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {Object.entries(step.clog).map(([x, st]) => (
                                                    <span key={x} className={`text-[11px] font-mono px-2 py-0.5 rounded border ${st === 'committed' ? 'border-green-500/50 text-green-300' : st === 'aborted' ? 'border-red-500/50 text-red-300' : 'border-amber-500/50 text-amber-300'}`}>
                                                        T{x}: {st}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="bg-slate-800/50 rounded-lg border border-slate-700/60 p-3">
                                            <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">What happened</div>
                                            <div className="space-y-0.5 max-h-28 overflow-y-auto font-mono text-[11px]">
                                                {step.log.length === 0 && <div className="text-slate-600">nothing yet</div>}
                                                {step.log.map((e, k) => (
                                                    <div key={k} className={`flex justify-between gap-2 ${k === step.log.length - 1 ? 'text-blue-200' : 'text-slate-400'}`}>
                                                        <span>{e.label}</span>
                                                        <span className="text-slate-500">{predict.hideExplanation && k === step.log.length - 1 ? '' : e.result}</span>
                                                    </div>
                                                ))}
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
                                <h3 className="font-bold text-white">The Visibility Rule</h3>
                            </div>
                            <ol className="space-y-3 text-sm text-slate-300 list-decimal list-inside">
                                <li>The version’s <span className="font-mono text-blue-300">xmin</span> is this transaction, or committed inside the snapshot.</li>
                                <li>Its <span className="font-mono text-blue-300">xmax</span> is empty, aborted, or not committed inside the snapshot.</li>
                            </ol>
                            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                                Both hold for at most one version per row. Commit and abort only flip a status in the commit log — nothing in the table is rewritten — which is why they are cheap.
                            </p>
                            <div className="mt-4 space-y-2 text-xs text-slate-400">
                                <div className="flex items-center gap-2"><span className="w-4 h-4 rounded border-2 border-dashed border-amber-500/70 bg-amber-500/10" />uncommitted version</div>
                                <div className="flex items-center gap-2"><span className="w-4 h-4 rounded border-2 border-red-500/50 bg-red-950/40" />created by an aborted transaction</div>
                                <div className="flex items-center gap-2"><span className="w-4 h-4 rounded border-2 border-slate-700 bg-slate-900" />replaced by a committed change</div>
                                <div className="flex items-center gap-2"><span className="w-4 h-4 rounded border-2 border-red-500 bg-red-500/15" />garbage VACUUM will remove</div>
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

export default MVCCPage;
