"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Shuffle, Info, Code2, Sigma, Clock } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

const BASE = {
    Employee: { attrs: ['eid', 'name', 'did', 'salary'], rows: [[1, 'Ana', 10, 72], [2, 'Ben', 20, 48], [3, 'Cara', 10, 95], [4, 'Dev', 30, 61], [5, 'Eli', 20, 55], [6, 'Fay', 10, 83]] },
    Dept: { attrs: ['did', 'dname', 'mgr'], rows: [[10, 'Eng', 3], [20, 'Sales', 5], [30, 'Ops', 4]] },
};

/* Expression trees. Predicates are data, not functions, so every condition
   can also be printed. Salaries are in thousands. */
const rel = (name) => ({ op: 'rel', name });
const sel = (pred, child) => ({ op: 'select', pred, child });
const proj = (attrs, child) => ({ op: 'project', attrs, child });
const ren = (from, to, child) => ({ op: 'rename', from, to, child });
const join = (left, right) => ({ op: 'join', left, right });
const union = (left, right) => ({ op: 'union', left, right });
const diff = (left, right) => ({ op: 'diff', left, right });

const EXPRESSIONS = [
    {
        id: 'dup', name: 'Projection drops duplicates',
        blurb: 'Which departments have someone earning over 60?',
        tree: proj(['dname'], sel({ attr: 'salary', cmp: '>', value: 60 }, join(rel('Employee'), rel('Dept')))),
    },
    {
        id: 'union', name: 'Union',
        blurb: 'Employees in department 10, or earning over 60 — or both.',
        tree: union(proj(['eid'], sel({ attr: 'did', cmp: '=', value: 10 }, rel('Employee'))), proj(['eid'], sel({ attr: 'salary', cmp: '>', value: 60 }, rel('Employee')))),
    },
    {
        id: 'diff', name: 'Difference + rename',
        blurb: 'Employees who manage no department.',
        tree: diff(proj(['eid'], rel('Employee')), ren('mgr', 'eid', proj(['mgr'], rel('Dept')))),
    },
    {
        id: 'rename-join', name: 'Rename to join',
        blurb: 'Each department with its manager’s name.',
        tree: proj(['dname', 'name'], join(rel('Dept'), ren('eid', 'mgr', proj(['eid', 'name'], rel('Employee'))))),
    },
];

const SYMBOL = { select: 'σ', project: 'π', rename: 'ρ', join: '⋈', union: '∪', diff: '−' };
const predText = (p) => `${p.attr} ${p.cmp} ${typeof p.value === 'string' ? `'${p.value}'` : p.value}`;
const testPred = (p, v) => (p.cmp === '>' ? v > p.value : p.cmp === '<' ? v < p.value : p.cmp === '>=' ? v >= p.value : v === p.value);
const paramOf = (n) => (n.op === 'select' ? predText(n.pred) : n.op === 'project' ? n.attrs.join(', ') : n.op === 'rename' ? `${n.to}←${n.from}` : '');

function exprText(n) {
    if (n.op === 'rel') return n.name;
    if (n.child) return `${SYMBOL[n.op]}[${paramOf(n)}](${exprText(n.child)})`;
    return `(${exprText(n.left)} ${SYMBOL[n.op]} ${exprText(n.right)})`;
}

function randomDb(rand = Math.random) {
    return {
        Employee: { attrs: BASE.Employee.attrs, rows: BASE.Employee.rows.map(([eid, name]) => [eid, name, [10, 20, 30][Math.floor(rand() * 3)], 40 + Math.floor(rand() * 60)]) },
        Dept: BASE.Dept,
    };
}

const tupleText = (attrs, row) => attrs.map((a, i) => `${a}=${row[i]}`).join(', ');
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

function generateSteps(expression, db = BASE) {
    // Flatten the tree, giving each node an id and a position for drawing.
    const nodes = [];
    let leafX = 0;
    const build = (n, depth) => {
        const id = nodes.length;
        const node = { id, op: n.op, src: n, depth, children: [], label: n.op === 'rel' ? n.name : SYMBOL[n.op], param: paramOf(n) };
        nodes.push(node);
        const kids = n.op === 'rel' ? [] : n.child ? [n.child] : [n.left, n.right];
        node.children = kids.map(k => build(k, depth + 1));
        node.x = node.children.length ? node.children.reduce((s, c) => s + nodes[c].x, 0) / node.children.length : leafX++;
        return id;
    };
    build(expression.tree, 0);
    const maxDepth = Math.max(...nodes.map(n => n.depth));

    const results = {};
    const steps = [];
    const snapshot = () => Object.fromEntries(Object.entries(results).map(([k, r]) => [k, { attrs: [...r.attrs], rows: r.rows.map(x => [...x]) }]));
    const push = (data, explanation) => steps.push({ nodes, maxDepth, leaves: leafX, expression, results: snapshot(), nodeId: null, phase: null, out: null, inputs: [], tuple: null, side: null, verdict: null, matches: [], newRow: null, ...data, explanation });

    push({ phase: 'intro' }, `${expression.blurb} The expression is a tree: base tables at the leaves, one operator per inner node. It is evaluated bottom-up — every operator takes whole relations in and gives one relation out.`);

    const order = [];
    const post = (id) => { nodes[id].children.forEach(post); order.push(id); };
    post(0);

    for (const id of order) {
        const n = nodes[id];
        const s = n.src;
        if (n.op === 'rel') {
            results[id] = { attrs: [...db[s.name].attrs], rows: db[s.name].rows.map(r => [...r]) };
            push({ nodeId: id, phase: 'leaf', out: results[id] }, `Leaf ${s.name}: ${results[id].rows.length} tuples with attributes (${results[id].attrs.join(', ')}).`);
            continue;
        }
        const ins = n.children.map(c => results[c]);
        const out = { attrs: [], rows: [] };
        const outSnap = () => ({ attrs: [...out.attrs], rows: out.rows.map(r => [...r]) });
        if (n.op === 'rename') {
            out.attrs = ins[0].attrs.map(a => (a === s.from ? s.to : a));
            out.rows = ins[0].rows.map(r => [...r]);
            results[id] = out;
            push({ nodeId: id, phase: 'done', out: outSnap(), inputs: n.children }, `ρ renames ${s.from} to ${s.to}. The tuples are untouched — only the schema changes, which is exactly what the next operator needs to line attributes up by name.`);
            continue;
        }
        if (n.op === 'select' || n.op === 'project' || n.op === 'diff') out.attrs = n.op === 'project' ? [...s.attrs] : [...ins[0].attrs];
        let common = [];
        if (n.op === 'join') {
            common = ins[0].attrs.filter(a => ins[1].attrs.includes(a));
            out.attrs = [...ins[0].attrs, ...ins[1].attrs.filter(a => !common.includes(a))];
        }
        if (n.op === 'union') out.attrs = [...ins[0].attrs];
        // Only the current operator's sentence is built: the others would
        // read fields (pred, attrs) this node does not have.
        const intro = (() => {
            if (n.op === 'select') return `σ ${predText(s.pred)}: keep the tuples that satisfy the condition, one at a time.`;
            if (n.op === 'project') return `π ${s.attrs.join(', ')}: keep only those attributes. Relations are sets, so a tuple that comes out the same as one already produced is dropped.`;
            if (n.op === 'join') return `⋈ natural join on ${common.length ? common.join(', ') : 'no common attribute (a cross product)'}: each left tuple pairs with every right tuple that agrees on ${common.length > 1 ? 'those attributes' : 'it'}.`;
            if (n.op === 'union') return `∪: everything in either input, once. Both sides have the schema (${ins[0].attrs.join(', ')}), so the union is defined.`;
            return `−: tuples of the left input that do not appear in the right input. Both sides have the schema (${ins[0].attrs.join(', ')}).`;
        })();
        push({ nodeId: id, phase: 'start', out: outSnap(), inputs: n.children }, intro);

        if (n.op === 'select') {
            const k = ins[0].attrs.indexOf(s.pred.attr);
            ins[0].rows.forEach((row, i) => {
                const ok = testPred(s.pred, row[k]);
                if (ok) out.rows.push([...row]);
                push({ nodeId: id, phase: 'tuple', out: outSnap(), inputs: n.children, tuple: i, side: 0, verdict: ok ? 'kept' : 'dropped', newRow: ok ? out.rows.length - 1 : null },
                    `${s.pred.attr} = ${row[k]}: ${ok ? `satisfies ${predText(s.pred)}, kept` : `fails ${predText(s.pred)}, dropped`}.`);
            });
        } else if (n.op === 'project') {
            const idx = s.attrs.map(a => ins[0].attrs.indexOf(a));
            ins[0].rows.forEach((row, i) => {
                const p = idx.map(k => row[k]);
                const dup = out.rows.some(r => same(r, p));
                if (!dup) out.rows.push(p);
                push({ nodeId: id, phase: 'tuple', out: outSnap(), inputs: n.children, tuple: i, side: 0, verdict: dup ? 'duplicate' : 'added', projected: p, newRow: dup ? out.rows.findIndex(r => same(r, p)) : out.rows.length - 1 },
                    dup ? `(${p.join(', ')}) is already in the result — set semantics keep one copy, so this one disappears.` : `(${p.join(', ')}) is new: added.`);
            });
        } else if (n.op === 'join') {
            const li = common.map(a => ins[0].attrs.indexOf(a)), ri = common.map(a => ins[1].attrs.indexOf(a));
            const extra = ins[1].attrs.map((a, k) => k).filter(k => !common.includes(ins[1].attrs[k]));
            ins[0].rows.forEach((row, i) => {
                const matches = ins[1].rows.map((r, j) => j).filter(j => li.every((k, m) => row[k] === ins[1].rows[j][ri[m]]));
                const firstNew = out.rows.length;
                matches.forEach(j => out.rows.push([...row, ...extra.map(k => ins[1].rows[j][k])]));
                push({ nodeId: id, phase: 'tuple', out: outSnap(), inputs: n.children, tuple: i, side: 0, verdict: String(matches.length), matches, newRow: matches.length ? firstNew : null },
                    matches.length ? `(${tupleText(ins[0].attrs, row)}) agrees with ${matches.length} right tuple${matches.length > 1 ? 's' : ''} on ${common.join(', ')}: ${matches.length} output tuple${matches.length > 1 ? 's' : ''}.` : `(${tupleText(ins[0].attrs, row)}) matches nothing on the right, so it contributes nothing — a natural join keeps only matching pairs.`);
            });
        } else if (n.op === 'union') {
            const align = ins[0].attrs.map(a => ins[1].attrs.indexOf(a));
            ins[0].rows.forEach(r => { if (!out.rows.some(x => same(x, r))) out.rows.push([...r]); });
            push({ nodeId: id, phase: 'union-left', out: outSnap(), inputs: n.children }, `All ${ins[0].rows.length} left tuples go in. Now each right tuple is added unless it is already there.`);
            ins[1].rows.forEach((row, i) => {
                const t = align.map(k => row[k]);
                const dup = out.rows.some(x => same(x, t));
                if (!dup) out.rows.push(t);
                push({ nodeId: id, phase: 'tuple', out: outSnap(), inputs: n.children, tuple: i, side: 1, verdict: dup ? 'duplicate' : 'added', newRow: dup ? out.rows.findIndex(x => same(x, t)) : out.rows.length - 1 },
                    dup ? `(${t.join(', ')}) came from the left input already — a set holds it once.` : `(${t.join(', ')}) is only on the right: added.`);
            });
        } else {
            const align = ins[0].attrs.map(a => ins[1].attrs.indexOf(a));
            const right = ins[1].rows.map(r => align.map(k => r[k]));
            ins[0].rows.forEach((row, i) => {
                const inRight = right.some(r => same(r, row));
                if (!inRight) out.rows.push([...row]);
                push({ nodeId: id, phase: 'tuple', out: outSnap(), inputs: n.children, tuple: i, side: 0, verdict: inRight ? 'removed' : 'kept', newRow: inRight ? null : out.rows.length - 1 },
                    inRight ? `(${tupleText(ins[0].attrs, row)}) also appears on the right, so it is removed.` : `(${tupleText(ins[0].attrs, row)}) is not on the right: kept.`);
            });
        }
        results[id] = out;
        push({ nodeId: id, phase: 'done', out: outSnap(), inputs: n.children }, `${SYMBOL[n.op]} produced ${out.rows.length} tuple${out.rows.length === 1 ? '' : 's'}. This relation is all its parent will ever see.`);
    }
    const final = results[0];
    push({ phase: 'final', nodeId: 0, out: final, inputs: [] }, `Result: ${final.rows.length} tuple${final.rows.length === 1 ? '' : 's'} — ${final.rows.map(r => `(${r.join(', ')})`).join(', ') || 'the empty relation'}. A database's query plan is this same kind of tree, with physical operators chosen for each node.`);
    return steps;
}

/* At every tuple the screen shows the operator, its parameter and both
   inputs, so what happens to the next tuple is decided. */
const predictFor = (step, next) => {
    if (!step || !next || next.phase !== 'tuple') return null;
    const n = next.nodes[next.nodeId];
    const input = next.results[n.children[next.side]];
    const row = input.rows[next.tuple];
    const t = `(${tupleText(input.attrs, row)})`;
    if (n.op === 'select') {
        return { question: `σ ${predText(n.src.pred)}: what happens to ${t}?`, options: ['Kept', 'Dropped'], correct: next.verdict === 'kept' ? 0 : 1, because: `Its ${n.src.pred.attr} is ${row[input.attrs.indexOf(n.src.pred.attr)]}.` };
    }
    if (n.op === 'project') {
        return { question: `π ${n.src.attrs.join(', ')} turns ${t} into (${next.projected.join(', ')}). What happens to it?`, options: ['Added', 'Dropped as a duplicate'], correct: next.verdict === 'added' ? 0 : 1, because: next.verdict === 'added' ? 'No tuple with those values is in the result yet.' : 'An identical tuple is already in the result, and a relation is a set.' };
    }
    if (n.op === 'join') {
        const k = next.matches.length;
        return { question: `How many tuples of the right input join with ${t}?`, options: ['None', 'One', 'Two', 'Three or more'], correct: Math.min(k, 3), because: k ? `${k} right tuple${k > 1 ? 's agree' : ' agrees'} with it on the common attributes.` : 'No right tuple agrees with it on the common attributes.' };
    }
    if (n.op === 'union') {
        return { question: `Right input of ∪: what happens to ${t}?`, options: ['Added', 'Already present'], correct: next.verdict === 'added' ? 0 : 1, because: next.verdict === 'added' ? 'The left input does not contain it.' : 'The left input already put it in the result.' };
    }
    return { question: `Left input of −: does ${t} survive?`, options: ['Kept', 'Removed'], correct: next.verdict === 'kept' ? 0 : 1, because: next.verdict === 'kept' ? 'It does not appear in the right input.' : 'It appears in the right input.' };
};

const quizQuestions = [
    {
        question: 'Employee has 6 tuples in 3 departments. How many tuples does π_did(Employee) contain?',
        options: ['6', '3', '1', 'It depends on the salaries'],
        correct: 1,
        explanation: 'Relational algebra works on sets: the six projected tuples collapse to one per distinct did. SQL keeps duplicates unless you write SELECT DISTINCT — that is the bag versus set difference.',
    },
    {
        question: 'Why does π_eid(Employee) − π_mgr(Dept) need a rename first?',
        options: [
            'Difference only works on numbers',
            'Both sides must have the same schema, and eid and mgr are different attribute names',
            'To remove duplicates',
            'It does not need one',
        ],
        correct: 1,
        explanation: 'Union, difference and intersection need union-compatible inputs: the same attributes. ρ renames mgr to eid so the two relations line up.',
    },
    {
        question: 'Which operator can make a relation larger than either of its inputs?',
        options: ['σ selection', 'π projection', '⋈ join', '− difference'],
        correct: 2,
        explanation: 'A join pairs tuples, so its output can be as large as the product of the inputs. Selection, projection and difference can only keep or drop what they are given.',
    },
];

const W_NODE = 110, H_LEVEL = 66;

function TreeView({ step }) {
    const width = Math.max(1, step.leaves) * W_NODE;
    const height = (step.maxDepth + 1) * H_LEVEL;
    const pos = (n) => ({ x: n.x * W_NODE + W_NODE / 2, y: n.depth * H_LEVEL + 28 });
    const done = (id) => step.results[id] !== undefined;
    return (
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ maxHeight: 340 }} className="overflow-visible">
            {step.nodes.flatMap(n => n.children.map(c => {
                const a = pos(n), b = pos(step.nodes[c]);
                return <line key={`${n.id}-${c}`} x1={a.x} y1={a.y + 16} x2={b.x} y2={b.y - 16} stroke={done(c) ? '#2dd4bf' : '#334155'} strokeWidth="2" style={{ transition: 'stroke 0.4s ease' }} />;
            }))}
            {step.nodes.map(n => {
                const p = pos(n);
                const current = step.nodeId === n.id && step.phase !== 'final';
                const isDone = done(n.id);
                const fill = current ? '#1d4ed8' : isDone ? '#134e4a' : '#1e293b';
                const stroke = current ? '#93c5fd' : isDone ? '#2dd4bf' : '#475569';
                const leaf = n.op === 'rel';
                return (
                    <g key={n.id}>
                        <rect x={p.x - (leaf ? 40 : 18)} y={p.y - 16} width={leaf ? 80 : 36} height="32" rx={leaf ? 6 : 16} fill={fill} stroke={stroke} strokeWidth="2" style={{ transition: 'fill 0.4s ease, stroke 0.4s ease' }} />
                        <text x={p.x} y={p.y + 5} textAnchor="middle" fontSize={leaf ? 12 : 17} fontWeight="700" fill="#f8fafc">{n.label}</text>
                        {n.param && <text x={p.x + 22} y={p.y + 4} fontSize="10" fill="#94a3b8">{n.param}</text>}
                        {isDone && (
                            <g>
                                <circle cx={p.x - (leaf ? 40 : 18)} cy={p.y - 16} r="9" fill="#14b8a6" />
                                <text x={p.x - (leaf ? 40 : 18)} y={p.y - 12} textAnchor="middle" fontSize="9" fontWeight="700" fill="#042f2e">{step.results[n.id].rows.length}</text>
                            </g>
                        )}
                    </g>
                );
            })}
        </svg>
    );
}

function MiniRelation({ title, relation, highlight, tone = 'blue', fresh }) {
    if (!relation) return null;
    const hl = tone === 'red' ? 'bg-red-500/20 text-red-200' : tone === 'yellow' ? 'bg-yellow-400/15 text-yellow-100' : 'bg-blue-500/20 text-blue-100';
    return (
        <div className="bg-slate-800/50 rounded-lg border border-slate-700/60 p-3 min-w-0">
            <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1.5">{title}</div>
            <table className="text-xs">
                <thead>
                    <tr className="text-slate-400 text-left">{relation.attrs.map(a => <th key={a} className="font-mono font-semibold pr-3 pb-1">{a}</th>)}</tr>
                </thead>
                <tbody>
                    {relation.rows.map((r, i) => (
                        <tr key={i} className={`transition-colors duration-300 ${highlight?.includes(i) ? hl : fresh === i ? 'bg-green-500/20 text-green-200' : 'text-slate-300'}`}>
                            {r.map((v, k) => <td key={k} className="font-mono pr-3 py-0.5">{v}</td>)}
                        </tr>
                    ))}
                    {relation.rows.length === 0 && <tr><td className="text-slate-600 py-0.5">∅ empty</td></tr>}
                </tbody>
            </table>
        </div>
    );
}

function RelationalAlgebraPage() {
    const [exprId, setExprId] = useState('dup');
    const [db, setDb] = useState(BASE);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1100);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const expression = EXPRESSIONS.find(e => e.id === exprId);

    useEffect(() => {
        setStepHistory(generateSteps(EXPRESSIONS.find(e => e.id === exprId), db));
        setCurrentStep(0);
    }, [exprId, db]);

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
    const shuffle = () => { setIsPlaying(false); setDb(randomDb()); };

    const step = stepHistory[currentStep];
    const node = step && step.nodeId !== null ? step.nodes[step.nodeId] : null;
    const tone = step && (step.verdict === 'dropped' || step.verdict === 'removed' || step.verdict === 'duplicate' || step.verdict === '0') ? 'red' : 'yellow';

    const handleQuizAnswer = (idx) => {
        if (quizState.answered) return;
        const correct = idx === quizQuestions[quizState.current].correct;
        setQuizState(s => ({ ...s, selected: idx, answered: true, score: correct ? s.score + 1 : s.score }));
    };
    const nextQuestion = () => {
        if (quizState.current + 1 >= quizQuestions.length) setQuizState(s => ({ ...s, complete: true }));
        else setQuizState(s => ({ ...s, current: s.current + 1, selected: null, answered: false }));
    };

    const codeExample = `-- Each relational algebra expression has an SQL twin.

-- π dname ( σ salary > 60 ( Employee ⋈ Dept ) )
SELECT DISTINCT dname                     -- π: SQL keeps duplicates
FROM Employee NATURAL JOIN Dept           -- ⋈   unless you say DISTINCT
WHERE salary > 60;                        -- σ

-- π eid (Employee)  −  ρ eid←mgr ( π mgr (Dept) )
SELECT eid FROM Employee
EXCEPT
SELECT mgr AS eid FROM Dept;              -- ρ is just AS

-- π eid ( σ did = 10 (Employee) )  ∪  π eid ( σ salary > 60 (Employee) )
SELECT eid FROM Employee WHERE did = 10
UNION                                     -- UNION removes duplicates,
SELECT eid FROM Employee WHERE salary > 60;  -- UNION ALL keeps them`;

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
                            <Sigma className="h-10 w-10" />Relational Algebra
                        </h1>
                        <p className="text-xl text-blue-100 mb-6 max-w-3xl mx-auto">
                            Six operators, each taking relations in and giving one relation out. Compose them into a tree and evaluate it from the leaves up — the same shape as every query plan.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">σ π ρ — one input</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">⋈ ∪ − — two inputs</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Set semantics</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6 mb-6">
                            <div className="flex flex-wrap items-center gap-2 mb-5">
                                <span className="text-xs uppercase tracking-wide text-slate-500 mr-1">Expression</span>
                                {EXPRESSIONS.map(e => (
                                    <button key={e.id} onClick={() => { setIsPlaying(false); setExprId(e.id); }}
                                        className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${e.id === exprId ? 'bg-blue-500/20 border-blue-400 text-blue-200' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                                        {e.name}
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
                                    <Shuffle size={18} />New Data
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
                                    <span className="text-sm text-slate-500">{node ? `${node.label}${node.param ? ` ${node.param}` : ''}` : ''}</span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-2">
                                    <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: `${((currentStep + 1) / Math.max(stepHistory.length, 1)) * 100}%` }} />
                                </div>
                            </div>

                            {step && (
                                <div className="space-y-4 mb-5">
                                    <div className="font-mono text-xs text-slate-300 bg-slate-950 border border-slate-700/60 rounded-lg px-3 py-2 overflow-x-auto whitespace-nowrap">{exprText(expression.tree)}</div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-slate-800/50 rounded-lg border border-slate-700/60 p-3">
                                            <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Expression tree (evaluated bottom-up)</div>
                                            <TreeView step={step} />
                                        </div>
                                        <div className="space-y-3">
                                            {step.phase === 'intro' && (
                                                <>
                                                    <MiniRelation title="Employee" relation={db.Employee} />
                                                    <MiniRelation title="Dept" relation={db.Dept} />
                                                </>
                                            )}
                                            {node && step.phase !== 'final' && step.inputs.map((c, k) => (
                                                <MiniRelation key={c} title={`Input ${step.inputs.length > 1 ? (k === 0 ? '(left) ' : '(right) ') : ''}— ${step.nodes[c].label}${step.nodes[c].param ? ` ${step.nodes[c].param}` : ''}`}
                                                    relation={step.results[c]}
                                                    highlight={step.phase === 'tuple' ? (step.side === k ? [step.tuple] : node.op === 'join' && k === 1 ? step.matches : []) : []}
                                                    tone={step.side === k ? tone : 'blue'} />
                                            ))}
                                            {step.out && step.phase !== 'intro' && (
                                                <MiniRelation title={step.phase === 'final' ? 'Result' : step.phase === 'leaf' ? `Base table ${node.label}` : `Output of ${node.label}${node.param ? ` ${node.param}` : ''}`}
                                                    relation={step.out}
                                                    highlight={step.phase === 'tuple' && step.verdict === 'duplicate' && step.newRow !== null ? [step.newRow] : []}
                                                    tone="yellow"
                                                    fresh={step.phase === 'tuple' && step.verdict !== 'duplicate' ? step.newRow : null} />
                                            )}
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
                                <h3 className="font-bold text-white">The Six Operators</h3>
                            </div>
                            <div className="space-y-2 text-sm">
                                {[
                                    ['select', 'σ', 'Selection', 'keeps tuples that satisfy a condition', 'WHERE'],
                                    ['project', 'π', 'Projection', 'keeps some attributes, drops duplicates', 'SELECT DISTINCT'],
                                    ['rename', 'ρ', 'Rename', 'renames attributes (or the relation)', 'AS'],
                                    ['join', '⋈', 'Natural join', 'pairs tuples that agree on shared attributes', 'NATURAL JOIN'],
                                    ['union', '∪', 'Union', 'tuples in either input', 'UNION'],
                                    ['diff', '−', 'Difference', 'tuples in the left but not the right', 'EXCEPT'],
                                ].map(([op, sym, name, body, sql]) => (
                                    <div key={op} className={`flex items-start gap-3 rounded-lg p-2 border transition-colors ${node && node.op === op ? 'border-blue-400/60 bg-blue-500/10' : 'border-transparent'}`}>
                                        <span className="text-xl font-bold text-blue-300 w-6 text-center">{sym}</span>
                                        <div>
                                            <div className="text-slate-200 font-semibold">{name} <span className="text-[10px] font-mono text-slate-500 ml-1">{sql}</span></div>
                                            <div className="text-xs text-slate-400">{body}</div>
                                        </div>
                                    </div>
                                ))}
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
                                <Code2 className="h-5 w-5" />{showCode ? 'Hide' : 'Show'} SQL Equivalents
                            </button>
                            {showCode && <div className="mt-4"><CodeBlock code={codeExample} language="sql" /></div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default RelationalAlgebraPage;
