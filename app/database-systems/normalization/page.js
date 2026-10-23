"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Code2, Table2, Clock, KeyRound, AlertTriangle } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* Two messy tables. Each lists its functional dependencies in the order the
   decomposition considers them; `multi` marks a column that holds a list, and
   `names` says what to call a table split off on a given left-hand side. */
const SCHEMAS = [
    {
        id: 'university', name: 'University enrollments', table: 'Enrollment',
        attrs: ['StudentID', 'Name', 'Phones', 'CourseID', 'Title', 'Dept', 'DeptHead', 'Instructor', 'Grade'],
        multi: [{ attr: 'Phones', single: 'Phone', owner: ['StudentID'], name: 'StudentPhone' }],
        fds: [
            { lhs: ['StudentID'], rhs: ['Name'] },
            { lhs: ['CourseID'], rhs: ['Title', 'Dept'] },
            { lhs: ['Dept'], rhs: ['DeptHead'] },
            { lhs: ['StudentID', 'CourseID'], rhs: ['Instructor', 'Grade'] },
            { lhs: ['Instructor'], rhs: ['CourseID'] },
        ],
        names: { StudentID: 'Student', CourseID: 'Course', Dept: 'Department', Instructor: 'Teaches' },
        rows: [
            ['S1', 'Ana', ['555-0101', '555-0199'], 'DB101', 'Databases', 'CS', 'Rao', 'Lee', 'A'],
            ['S1', 'Ana', ['555-0101', '555-0199'], 'OS201', 'Operating Systems', 'CS', 'Rao', 'Okafor', 'B'],
            ['S2', 'Ben', ['555-0142'], 'DB101', 'Databases', 'CS', 'Rao', 'Patel', 'B'],
            ['S2', 'Ben', ['555-0142'], 'ST110', 'Statistics', 'Math', 'Kim', 'Novak', 'A'],
            ['S3', 'Cara', ['555-0173', '555-0104'], 'DB101', 'Databases', 'CS', 'Rao', 'Lee', 'C'],
            ['S3', 'Cara', ['555-0173', '555-0104'], 'OS201', 'Operating Systems', 'CS', 'Rao', 'Okafor', 'A'],
        ],
        anomalies: [
            { kind: 'update', col: 'DeptHead', match: { Dept: 'CS' }, to: 'Singh', missed: 4,
                text: 'Update anomaly: CS gets a new head, Singh. That single fact is stored in five rows and all five must change. Miss one — row 5 here — and the table now disagrees with itself about who runs CS.' },
            { kind: 'insert', ghost: ['NULL', '', '', 'ML301', 'Machine Learning', 'CS', 'Rao', '', ''],
                text: 'Insert anomaly: a new course, ML301, opens before anyone enrols. It cannot be stored — StudentID is part of every key of this table, and a key cannot be NULL.' },
            { kind: 'delete', row: 3,
                text: 'Delete anomaly: Ben drops Statistics. Deleting that enrollment also deletes the only record that Statistics exists, that it belongs to Math, that Kim heads Math and that Novak teaches it.' },
        ],
    },
    {
        id: 'orders', name: 'Order lines', table: 'OrderLine',
        attrs: ['OrderID', 'Date', 'CustomerID', 'Name', 'City', 'ProductID', 'Item', 'Qty'],
        multi: [],
        fds: [
            { lhs: ['OrderID'], rhs: ['Date', 'CustomerID'] },
            { lhs: ['CustomerID'], rhs: ['Name', 'City'] },
            { lhs: ['ProductID'], rhs: ['Item'] },
            { lhs: ['OrderID', 'ProductID'], rhs: ['Qty'] },
        ],
        names: { OrderID: 'Orders', CustomerID: 'Customer', ProductID: 'Product' },
        rows: [
            ['O1', 'Mar 01', 'C1', 'Ana', 'Lyon', 'P1', 'Pen', 3],
            ['O1', 'Mar 01', 'C1', 'Ana', 'Lyon', 'P2', 'Ink', 1],
            ['O2', 'Mar 02', 'C2', 'Ben', 'Oslo', 'P1', 'Pen', 10],
            ['O3', 'Mar 02', 'C1', 'Ana', 'Lyon', 'P3', 'Pad', 2],
            ['O3', 'Mar 02', 'C1', 'Ana', 'Lyon', 'P1', 'Pen', 1],
        ],
        anomalies: [
            { kind: 'update', col: 'City', match: { CustomerID: 'C1' }, to: 'Nice', missed: 3,
                text: 'Update anomaly: Ana moves to Nice. Her city is repeated on every line of every order she ever placed — four rows. Miss one and Ana lives in two cities at once.' },
            { kind: 'insert', ghost: ['NULL', '', 'C3', 'Cy', 'Rome', 'NULL', '', ''],
                text: 'Insert anomaly: a new customer, Cy, signs up but has not ordered. With no OrderID or ProductID there is no key, so Cy cannot be stored at all.' },
            { kind: 'delete', row: 2,
                text: 'Delete anomaly: order O2 is cancelled. It was Ben’s only order, so deleting it also forgets that Ben exists and lives in Oslo.' },
        ],
    },
];

const NF_RULES = {
    '2NF': 'No non-prime attribute may depend on only part of a candidate key.',
    '3NF': 'For every dependency X → A, X is a superkey or A is prime (part of some key).',
    'BCNF': 'For every dependency X → A, X is a superkey. No exceptions.',
};

const fmt = (attrs) => attrs.join(', ');
const setText = (attrs) => `{${fmt(attrs)}}`;

function closure(attrs, fds) {
    const c = new Set(attrs);
    let changed = true;
    while (changed) {
        changed = false;
        for (const f of fds) {
            if (f.lhs.every(a => c.has(a)) && f.rhs.some(a => !c.has(a))) {
                f.rhs.forEach(a => c.add(a));
                changed = true;
            }
        }
    }
    return c;
}

const bitCount = (m) => { let n = 0; while (m) { n += m & 1; m >>= 1; } return n; };
/** Subsets of R, smallest first, as attribute arrays in R's order. */
const subsetsOf = (R) => Array.from({ length: (1 << R.length) - 1 }, (_, i) => i + 1)
    .sort((a, b) => bitCount(a) - bitCount(b) || a - b)
    .map(m => R.filter((_, i) => m & (1 << i)));

function keysOf(R, fds) {
    const keys = [];
    for (const X of subsetsOf(R)) {
        if (keys.some(k => k.every(a => X.includes(a)))) continue;
        const cl = closure(X, fds);
        if (R.every(a => cl.has(a))) keys.push(X);
    }
    return keys;
}

const isSuperkey = (X, R, fds) => { const cl = closure(X, fds); return R.every(a => cl.has(a)); };

/** What X determines inside R, beyond X itself. */
const determines = (X, R, fds) => { const cl = closure(X, fds); return R.filter(a => cl.has(a) && !X.includes(a)); };

/** The test for one normal form: returns { violates, move, partOf, why }. */
function judge(nf, X, R, fds, keys = keysOf(R, fds)) {
    const prime = new Set(keys.flat());
    const A = determines(X, R, fds);
    const nonprime = A.filter(a => !prime.has(a));
    const superkey = isSuperkey(X, R, fds);
    if (nf === '2NF') {
        const partOf = keys.find(k => X.length < k.length && X.every(a => k.includes(a)));
        if (partOf && nonprime.length) return { violates: true, move: nonprime, partOf };
        return { violates: false, why: !partOf ? (superkey ? 'superkey' : 'not-part') : 'prime', partOf };
    }
    if (nf === '3NF') {
        if (!superkey && nonprime.length) return { violates: true, move: nonprime };
        return { violates: false, why: superkey ? 'superkey' : 'prime' };
    }
    if (!superkey && A.length) return { violates: true, move: A };
    return { violates: false, why: 'superkey' };
}

function project(rows, from, to) {
    const idx = to.map(a => from.indexOf(a));
    const seen = new Set();
    const out = [];
    for (const r of rows) {
        const p = idx.map(i => r[i]);
        const key = JSON.stringify(p);
        if (!seen.has(key)) { seen.add(key); out.push(p); }
    }
    return out;
}

function flatten(schema) {
    const multi = schema.multi ?? [];
    const U = schema.attrs.map(a => multi.find(m => m.attr === a)?.single ?? a);
    let rows = schema.rows.map(r => [...r]);
    schema.attrs.forEach((a, i) => {
        if (!multi.some(m => m.attr === a)) return;
        rows = rows.flatMap(r => (Array.isArray(r[i]) ? r[i] : [r[i]]).map(v => { const c = [...r]; c[i] = v; return c; }));
    });
    return { U, rows };
}

/** Whether an FD can still be checked using the decomposed tables alone. */
function preserved(fd, rels, fds) {
    const Z = new Set(fd.lhs);
    let changed = true;
    while (changed) {
        changed = false;
        for (const R of rels) {
            const inR = [...Z].filter(a => R.includes(a));
            for (const a of closure(inR, fds)) if (R.includes(a) && !Z.has(a)) { Z.add(a); changed = true; }
        }
    }
    return fd.rhs.every(a => Z.has(a));
}

function generateSteps(schema) {
    const steps = [];
    const fds = schema.fds;
    const multi = schema.multi ?? [];
    const base = flatten(schema);
    const multiAttrs = multi.map(m => m.attr);
    let rels = [{ name: schema.table, attrs: [...schema.attrs], raw: true }];
    let counter = 0;
    const nameFor = (X) => {
        const n = X.length === 1 ? schema.names?.[X[0]] : null;
        if (n && !rels.some(r => r.name === n)) return n;
        counter += 1;
        return `R${counter}`;
    };

    const fdsIn = (R) => {
        const out = [];
        for (const f of fds) {
            if (!f.lhs.every(a => R.includes(a)) || out.some(o => o.lhs.join() === f.lhs.join())) continue;
            const A = determines(f.lhs, R, fds);
            if (A.length) out.push({ lhs: f.lhs, rhs: A });
        }
        return out;
    };
    const view = (r, fresh) => {
        const attrs = r.attrs;
        const plain = attrs.filter(a => !multiAttrs.includes(a));
        return {
            name: r.name, attrs, raw: Boolean(r.raw),
            keys: keysOf(plain, fds),
            rows: r.raw ? schema.rows.map(row => row.map(v => (Array.isArray(v) ? v.join(', ') : v))) : project(base.rows, base.U, attrs),
            // The original table shows the dependencies as written; split
            // tables show what each left side determines inside them.
            fds: r.raw ? fds.map(f => ({ lhs: f.lhs, rhs: f.rhs })) : fdsIn(plain),
            multi: attrs.filter(a => multiAttrs.includes(a)),
            fresh: fresh.includes(r.name),
        };
    };
    const push = (data, explanation, fresh = []) => steps.push({ relations: rels.map(r => view(r, fresh)), focus: null, anomaly: null, ...data, explanation });

    const raw = view(rels[0], []);
    push({ stage: 'intro', kind: 'intro' },
        `${schema.table} keeps everything in one table: ${raw.rows.length} rows, ${schema.attrs.length} columns. Its functional dependencies — X → Y means rows that agree on X must agree on Y — are listed under it. Candidate keys: ${raw.keys.map(setText).join(' and ')}${multiAttrs.length ? ` (ignoring the list column ${fmt(multiAttrs)})` : ''}.`);

    for (const an of schema.anomalies ?? []) push({ stage: 'anomalies', kind: 'anomaly', anomaly: an }, an.text);

    /* 1NF: one value per cell. */
    if (multi.length) {
        const m = multi[0];
        push({ stage: '1NF', kind: 'consider', focus: { rel: schema.table, lhs: [], rhs: [m.attr], move: [m.attr] } },
            `1NF: every cell must hold a single value. ${m.attr} holds a list, so a question like "who has phone 555-0199?" means picking strings apart, and two people's lists can never be joined cleanly.`);
        const splitOff = { name: m.name, attrs: [...m.owner, m.single] };
        const rest = { name: schema.table, attrs: schema.attrs.filter(a => a !== m.attr) };
        rels = [rest, splitOff];
        const sp = view(splitOff, []);
        push({ stage: '1NF', kind: 'split', focus: { rel: m.name, lhs: m.owner, rhs: [m.single], move: [m.single] } },
            `Each phone number becomes its own row in ${m.name}(${fmt(splitOff.attrs)}), ${sp.rows.length} rows keyed by both columns. ${schema.table} loses the list column and is now in 1NF.`, [m.name, schema.table]);
    } else {
        rels = [{ name: schema.table, attrs: [...schema.attrs] }];
        push({ stage: '1NF', kind: 'stage-ok' }, '1NF: every cell already holds a single value, so the table is in 1NF as it stands. The trouble is elsewhere.');
    }

    for (const nf of ['2NF', '3NF', 'BCNF']) {
        push({ stage: nf, kind: 'stage', nf }, `${nf}: ${NF_RULES[nf]} Check each table's dependencies in turn.`);
        const work = rels.map(r => r.name);
        let guard = 0;
        while (work.length && guard++ < 50) {
            const name = work.shift();
            const R = rels.find(r => r.name === name);
            if (!R) continue;
            const keys = keysOf(R.attrs, fds);
            const listed = fdsIn(R.attrs).map(f => ({ X: f.lhs, derived: false }));
            /* The listed dependencies come first, in the order a person would
               check them. Only if none of them breaks the form are all other
               subsets tried, so a violation that follows from the listed ones
               is never missed. */
            const candidates = function* () {
                yield* listed;
                for (const X of subsetsOf(R.attrs)) if (!listed.some(l => l.X.join() === X.join())) yield { X, derived: true };
            };
            let split = null;
            for (const cand of candidates()) {
                const A = determines(cand.X, R.attrs, fds);
                if (!A.length || isSuperkey(cand.X, R.attrs, fds)) continue;
                const v = judge(nf, cand.X, R.attrs, fds, keys);
                if (cand.derived && !v.violates) continue;
                const fdText = `${fmt(cand.X)} → ${fmt(A)}`;
                const prime = new Set(keys.flat());
                push({ stage: nf, kind: 'consider', nf, focus: { rel: R.name, lhs: cand.X, rhs: A, move: [] }, fd: fdText },
                    `${R.name}: consider ${fdText}${cand.derived ? ' (it follows from the listed dependencies)' : ''}. Keys of ${R.name}: ${keys.map(setText).join(', ')}. ${A.map(a => `${a} is ${prime.has(a) ? 'prime' : 'non-prime'}`).join('; ')}.`);
                let text;
                if (v.violates) {
                    if (nf === '2NF') text = `Violates 2NF: ${fmt(cand.X)} is only part of the key ${setText(v.partOf)}, yet on its own it fixes ${fmt(v.move)} — a partial dependency. Those values are repeated for every ${fmt(v.partOf.filter(a => !cand.X.includes(a)))} they appear with.`;
                    else if (nf === '3NF') text = `Violates 3NF: ${fmt(cand.X)} is not a key, and ${fmt(v.move)} ${v.move.length > 1 ? 'are' : 'is'} non-prime — a transitive dependency, key → ${fmt(cand.X)} → ${fmt(v.move)}.`;
                    else text = `Violates BCNF: ${fmt(cand.X)} is not a superkey of ${R.name}, yet it determines ${fmt(v.move)}. 3NF let this through because ${fmt(v.move)} is prime; BCNF does not.`;
                } else if (v.why === 'not-part') text = `Fine for 2NF: ${fmt(cand.X)} is not part of any key, so this is not a partial dependency. (3NF will look at it.)`;
                else if (v.why === 'prime') text = `Allowed in ${nf}: ${fmt(A)} ${A.length > 1 ? 'are' : 'is'} prime — part of a key — and ${nf} only polices non-prime attributes.${nf === '3NF' ? ' BCNF will not be so forgiving.' : ''}`;
                else text = `Allowed: ${fmt(cand.X)} is a superkey of ${R.name}.`;
                push({ stage: nf, kind: 'verdict', nf, violates: v.violates, focus: { rel: R.name, lhs: cand.X, rhs: A, move: v.violates ? v.move : [] }, fd: fdText }, text);
                if (v.violates) { split = { X: cand.X, move: v.move }; break; }
            }
            if (!split) continue;
            const before = view(R, []).rows.length;
            const newName = nameFor(split.X);
            const R1 = { name: newName, attrs: [...R.attrs.filter(a => split.X.includes(a)), ...R.attrs.filter(a => split.move.includes(a))] };
            const R2 = { name: R.name, attrs: R.attrs.filter(a => !split.move.includes(a)) };
            const at = rels.indexOf(R);
            rels.splice(at, 1, R2, R1);
            const n1 = view(R1, []).rows.length;
            push({ stage: nf, kind: 'split', nf, focus: { rel: newName, lhs: split.X, rhs: split.move, move: split.move } },
                `Split on ${fmt(split.X)}: ${fmt(split.move)} ${split.move.length > 1 ? 'move' : 'moves'} into ${newName}(${fmt(R1.attrs)}), where ${fmt(split.X)} is the key, and ${R.name} keeps ${fmt(R2.attrs)}. The fact that was repeated across ${before} rows now lives in ${n1}. Joining the two on ${fmt(split.X)} gives back exactly the original rows — the split is lossless.`,
                [newName, R.name]);
            work.unshift(R2.name, R1.name);
        }
        push({ stage: nf, kind: 'stage-ok', nf }, `Every table is in ${nf}: ${rels.map(r => `${r.name}(${fmt(r.attrs)})`).join(', ')}.`);
    }

    const lost = fds.filter(f => !preserved(f, rels.map(r => r.attrs), fds));
    push({ stage: 'done', kind: 'final', lost: lost.map(f => `${fmt(f.lhs)} → ${fmt(f.rhs)}`) },
        `Done: ${rels.length} tables in BCNF, each fact stored once, and the original rows come back with a natural join. ${lost.length
            ? `The price: ${lost.map(f => `${fmt(f.lhs)} → ${fmt(f.rhs)}`).join(' and ')} no longer fits inside any one table, so the database cannot enforce it without a join. When that matters, designers stop at 3NF, which can always preserve every dependency.`
            : 'Every dependency still fits inside a single table, so each one can be enforced with a simple key constraint.'}`);
    return steps;
}

/* At every dependency check the screen shows the table, its keys (prime
   columns underlined) and the dependency: enough to apply the definition. */
const predictFor = (step, next) => {
    if (!step || !next || step.kind !== 'consider' || next.kind !== 'verdict' || !step.nf) return null;
    return {
        question: `${step.focus.rel}: does ${step.fd} violate ${step.nf}?`,
        options: [`Violates ${step.nf}`, `Allowed in ${step.nf}`],
        correct: next.violates ? 0 : 1,
        because: next.violates
            ? (step.nf === '2NF' ? 'Its left side is a proper part of a key and it determines a non-prime attribute.'
                : step.nf === '3NF' ? 'Its left side is not a superkey and it determines a non-prime attribute.'
                    : 'Its left side is not a superkey — BCNF needs nothing more to object.')
            : (step.nf === 'BCNF' ? 'Its left side is a superkey.' : 'Either its left side is not part of a key (2NF), it is a superkey, or everything it determines is prime.'),
    };
};

const quizQuestions = [
    {
        question: 'A table has key {StudentID, CourseID} and the dependency StudentID → Name. Which normal form does it break?',
        options: ['1NF', '2NF', 'BCNF only', 'None'],
        correct: 1,
        explanation: 'Name depends on only part of the key — a partial dependency. Each student’s name is repeated once per course they take, which is exactly the redundancy 2NF removes.',
    },
    {
        question: 'Why is a table in 3NF not always in BCNF?',
        options: [
            '3NF allows multi-valued cells',
            '3NF allows X → A when A is part of a candidate key, even if X is not a superkey',
            'BCNF only applies to tables with one key',
            'They are always the same',
        ],
        correct: 1,
        explanation: 'Instructor → CourseID, where CourseID is prime, is allowed in 3NF. BCNF rejects it because Instructor is not a superkey — and decomposing it loses the dependency {StudentID, CourseID} → Instructor.',
    },
    {
        question: 'What makes splitting R into R1 and R2 lossless?',
        options: [
            'R1 and R2 have the same number of rows',
            'The shared columns form a key of R1 or of R2',
            'Every column appears in exactly one table',
            'The tables are in BCNF',
        ],
        correct: 1,
        explanation: 'If the common attributes determine all of R1 (or R2), each row of the other table matches at most one row on the join, so no spurious rows appear. Splitting on X → Y with X kept in both does exactly that.',
    },
];

function RelationTable({ rel, step }) {
    const focus = step.focus && step.focus.rel === rel.name ? step.focus : null;
    const an = rel.raw ? step.anomaly : null;
    const prime = new Set(rel.keys.flat());
    const colTone = (a) => {
        if (!focus) return '';
        if (focus.move.includes(a) && step.kind === 'split') return 'bg-teal-500/25 text-teal-100';
        if (focus.lhs.includes(a)) return 'bg-blue-500/25 text-blue-100';
        if (focus.rhs.includes(a)) return step.kind === 'verdict' && step.violates ? 'bg-red-500/25 text-red-100' : 'bg-amber-500/20 text-amber-100';
        return '';
    };
    const matches = (row) => an && an.kind === 'update' && Object.entries(an.match).every(([k, v]) => row[rel.attrs.indexOf(k)] === v);
    return (
        <div className="bg-slate-800/60 rounded-lg border border-slate-700/60 p-3 min-w-0" style={rel.fresh ? { animation: 'normsplit 0.6s ease' } : undefined}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="font-bold text-slate-100">{rel.name}</span>
                <span className="text-[10px] text-slate-500">{rel.rows.length} rows</span>
            </div>
            <div className="overflow-x-auto">
                <table className="text-[11px] border-collapse">
                    <thead>
                        <tr>
                            {rel.attrs.map(a => (
                                <th key={a} className={`px-2 py-1 text-left font-semibold whitespace-nowrap border-b border-slate-600 transition-colors ${colTone(a) || 'text-slate-300'} ${prime.has(a) ? 'underline decoration-2 underline-offset-2' : ''}`}>
                                    {a}{rel.multi.includes(a) ? ' *' : ''}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rel.rows.map((row, i) => {
                            const deleted = an && an.kind === 'delete' && an.row === i;
                            return (
                                <tr key={i} className={`border-b border-slate-800 ${deleted ? 'bg-red-500/15 line-through text-red-300' : 'text-slate-300'}`}>
                                    {row.map((v, j) => {
                                        let cell = v;
                                        let tone = '';
                                        if (an && an.kind === 'update' && rel.attrs[j] === an.col && matches(row)) {
                                            if (i === an.missed) tone = 'bg-red-500/25 text-red-200 font-semibold';
                                            else { cell = an.to; tone = 'bg-green-500/20 text-green-200 font-semibold'; }
                                        }
                                        return <td key={j} className={`px-2 py-1 whitespace-nowrap transition-colors ${tone} ${colTone(rel.attrs[j]) ? 'bg-slate-700/30' : ''}`}>{cell}</td>;
                                    })}
                                </tr>
                            );
                        })}
                        {an && an.kind === 'insert' && (
                            <tr className="border-b border-dashed border-red-500/60 text-slate-500">
                                {an.ghost.map((v, j) => <td key={j} className={`px-2 py-1 whitespace-nowrap ${v === 'NULL' ? 'text-red-300 font-bold' : ''}`}>{v}</td>)}
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
                {rel.keys.map((k, i) => (
                    <span key={i} className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400"><KeyRound className="h-3 w-3" />{setText(k)}</span>
                ))}
                {rel.fds.map((f, i) => {
                    const on = focus && f.lhs.join() === focus.lhs.join();
                    return <span key={`f${i}`} className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${on ? 'border-blue-400 text-blue-200 bg-blue-500/10' : 'border-slate-700 text-slate-400'}`}>{fmt(f.lhs)} → {fmt(f.rhs)}</span>;
                })}
            </div>
        </div>
    );
}

const STAGES = ['intro', 'anomalies', '1NF', '2NF', '3NF', 'BCNF', 'done'];
const STAGE_LABEL = { intro: 'Table', anomalies: 'Anomalies', '1NF': '1NF', '2NF': '2NF', '3NF': '3NF', BCNF: 'BCNF', done: 'Result' };

function NormalizationPage() {
    const [schemaId, setSchemaId] = useState('university');
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1400);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    useEffect(() => {
        setStepHistory(generateSteps(SCHEMAS.find(s => s.id === schemaId)));
        setCurrentStep(0);
    }, [schemaId]);

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

    const reset = () => { setIsPlaying(false); setCurrentStep(0); };
    const step = stepHistory[currentStep];
    const stageIdx = step ? STAGES.indexOf(step.stage) : 0;

    const handleQuizAnswer = (idx) => {
        if (quizState.answered) return;
        const correct = idx === quizQuestions[quizState.current].correct;
        setQuizState(s => ({ ...s, selected: idx, answered: true, score: correct ? s.score + 1 : s.score }));
    };
    const nextQuestion = () => {
        if (quizState.current + 1 >= quizQuestions.length) setQuizState(s => ({ ...s, complete: true }));
        else setQuizState(s => ({ ...s, current: s.current + 1, selected: null, answered: false }));
    };

    const codeExample = `from itertools import combinations

def closure(attrs, fds):
    """Everything attrs determines. fds: list of (lhs, rhs) sets."""
    result = set(attrs)
    changed = True
    while changed:
        changed = False
        for lhs, rhs in fds:
            if lhs <= result and not rhs <= result:
                result |= rhs
                changed = True
    return result

def bcnf(relation, fds):
    """Split until every X -> Y inside a table has X as a superkey."""
    for size in range(1, len(relation)):
        for x in map(set, combinations(sorted(relation), size)):
            moved = (closure(x, fds) & relation) - x
            if moved and not relation <= closure(x, fds):
                # x -> moved violates BCNF: split on it (lossless,
                # because x is the key of the first piece)
                return (bcnf(x | moved, fds) +
                        bcnf(relation - moved, fds))
    return [relation]

fds = [({'Instructor'}, {'CourseID'}),
       ({'StudentID', 'CourseID'}, {'Instructor', 'Grade'})]
print(bcnf({'StudentID', 'CourseID', 'Instructor', 'Grade'}, fds))
# [{'Instructor', 'CourseID'}, {'StudentID', 'Instructor', 'Grade'}]`;

    return (
        <div className="min-h-screen bg-slate-950">
            <style>{'@keyframes normsplit { from { opacity: 0; transform: translateY(-10px) scale(0.97); } to { opacity: 1; transform: none; } }'}</style>
            <div className="bg-gradient-to-r from-blue-500 to-teal-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex items-center mb-6">
                        <Link href="/database-systems" className="flex items-center text-white hover:text-blue-200 transition-colors mr-4">
                            <ArrowLeft className="h-5 w-5 mr-2" />Back to Database Systems
                        </Link>
                    </div>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4 flex items-center justify-center gap-3">
                            <Table2 className="h-10 w-10" />Normalization
                        </h1>
                        <p className="text-xl text-blue-100 mb-6 max-w-3xl mx-auto">
                            One wide table stores the same fact over and over — until an update misses a copy. Follow the functional dependencies as the table splits into 1NF, 2NF, 3NF and BCNF.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Functional dependencies</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Lossless splits</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Each fact stored once</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6 mb-6">
                            <div className="flex flex-wrap items-center gap-2 mb-5">
                                <span className="text-xs uppercase tracking-wide text-slate-500 mr-1">Table</span>
                                {SCHEMAS.map(s => (
                                    <button key={s.id} onClick={() => { setIsPlaying(false); setSchemaId(s.id); }}
                                        className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${s.id === schemaId ? 'bg-blue-500/20 border-blue-400 text-blue-200' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                                        {s.name}
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
                                <PredictToggle predict={predict} accent="blue" />
                            </div>

                            <div className="mb-5">
                                <label className="block text-sm font-medium mb-2 text-slate-300">Animation Speed: {speed}ms</label>
                                <input type="range" min="200" max="2000" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-full max-w-md accent-blue-500" />
                            </div>

                            <div className="mb-5">
                                <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
                                    <span className="text-sm font-medium text-slate-300">Step {currentStep + 1} of {stepHistory.length}</span>
                                    <div className="flex flex-wrap gap-1">
                                        {STAGES.map((s, k) => (
                                            <span key={s} className={`text-[10px] px-2 py-0.5 rounded border ${k === stageIdx ? 'bg-blue-500/20 border-blue-400 text-blue-200' : k < stageIdx ? 'border-slate-700 text-slate-400' : 'border-transparent text-slate-600'}`}>{STAGE_LABEL[s]}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-2">
                                    <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: `${((currentStep + 1) / Math.max(stepHistory.length, 1)) * 100}%` }} />
                                </div>
                            </div>

                            {step && (
                                <div className="mb-5 space-y-3">
                                    {step.nf && (
                                        <div className="text-xs text-slate-400 bg-slate-800/50 border border-slate-700/60 rounded-lg px-3 py-2">
                                            <span className="font-semibold text-blue-300">{step.nf}</span> — {NF_RULES[step.nf]}
                                        </div>
                                    )}
                                    {step.anomaly && (
                                        <div className="flex items-center gap-2 text-xs text-red-300">
                                            <AlertTriangle className="h-4 w-4" />{step.anomaly.kind} anomaly
                                        </div>
                                    )}
                                    <div className="flex flex-wrap gap-3 items-start">
                                        {step.relations.map(rel => <RelationTable key={rel.name} rel={rel} step={step} />)}
                                    </div>
                                    {step.kind === 'final' && step.lost.length > 0 && (
                                        <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                                            Not preserved: {step.lost.join(', ')}
                                        </div>
                                    )}
                                    <div className="flex flex-wrap gap-3 text-[11px] text-slate-400">
                                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500/40" />left side (X)</span>
                                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500/40" />what X determines</span>
                                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-teal-500/40" />columns moving out</span>
                                        <span className="underline decoration-2">prime (part of a key)</span>
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
                                <h3 className="font-bold text-white">The Normal Forms</h3>
                            </div>
                            <div className="space-y-3 text-sm">
                                {[['1NF', 'Every cell holds one atomic value.'], ['2NF', NF_RULES['2NF']], ['3NF', NF_RULES['3NF']], ['BCNF', NF_RULES.BCNF]].map(([nf, rule]) => (
                                    <div key={nf} className={`rounded-lg p-2 border transition-colors ${step && step.stage === nf ? 'border-blue-400/60 bg-blue-500/10' : 'border-transparent'}`}>
                                        <div className={`font-semibold ${step && step.stage === nf ? 'text-blue-200' : 'text-slate-200'}`}>{nf}</div>
                                        <div className="text-xs text-slate-400 leading-relaxed">{rule}</div>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                                Each form implies the ones before it. A <em>prime</em> attribute belongs to at least one candidate key; a <em>superkey</em> determines every column of its table.
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

export default NormalizationPage;
