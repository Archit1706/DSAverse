"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Shuffle, Info, Code2, ListOrdered, Clock, AlertTriangle, ChevronRight } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

const LOGICAL = ['FROM', 'JOIN', 'WHERE', 'GROUP BY', 'HAVING', 'SELECT', 'DISTINCT', 'ORDER BY', 'LIMIT'];

const DATA = {
    employees: [
        { id: 1, name: 'Ana', dept: 1, salary: 72000 },
        { id: 2, name: 'Ben', dept: 2, salary: 48000 },
        { id: 3, name: 'Cara', dept: 1, salary: 95000 },
        { id: 4, name: 'Dev', dept: 3, salary: 61000 },
        { id: 5, name: 'Eli', dept: 2, salary: 55000 },
        { id: 6, name: 'Fay', dept: 1, salary: 83000 },
        { id: 7, name: 'Gus', dept: 3, salary: 39000 },
        { id: 8, name: 'Hana', dept: 2, salary: 67000 },
        { id: 9, name: 'Ivan', dept: 5, salary: 58000 },
    ],
    departments: [{ id: 1, name: 'Eng' }, { id: 2, name: 'Sales' }, { id: 3, name: 'Ops' }, { id: 4, name: 'Legal' }],
};

/* Each query is written the way you would type it (`lines`, in written
   order) plus the pieces the engine needs to run it. */
const QUERIES = [
    {
        id: 'report', name: 'Department report',
        lines: [
            { clause: 'SELECT', text: 'SELECT d.name AS dept, COUNT(*) AS headcount, AVG(e.salary) AS avg_salary' },
            { clause: 'FROM', text: 'FROM employees e' },
            { clause: 'JOIN', text: 'JOIN departments d ON e.dept_id = d.id' },
            { clause: 'WHERE', text: 'WHERE e.salary > 50000' },
            { clause: 'GROUP BY', text: 'GROUP BY d.name' },
            { clause: 'HAVING', text: 'HAVING COUNT(*) >= 2' },
            { clause: 'ORDER BY', text: 'ORDER BY avg_salary DESC' },
            { clause: 'LIMIT', text: 'LIMIT 1' },
        ],
        join: true,
        where: { label: 'e.salary > 50000', test: (v) => v['e.salary'] > 50000 },
        groupBy: ['d.name'],
        having: { label: 'COUNT(*) >= 2', test: (rows) => rows.length >= 2 },
        select: [{ as: 'dept', col: 'd.name' }, { as: 'headcount', agg: 'COUNT' }, { as: 'avg_salary', agg: 'AVG', col: 'e.salary' }],
        orderBy: { key: 'avg_salary', desc: true, alias: true },
        limit: 1,
    },
    {
        id: 'distinct', name: 'Distinct departments',
        lines: [
            { clause: 'SELECT', also: 'DISTINCT', text: 'SELECT DISTINCT d.name AS dept' },
            { clause: 'FROM', text: 'FROM employees e' },
            { clause: 'JOIN', text: 'JOIN departments d ON e.dept_id = d.id' },
            { clause: 'WHERE', text: 'WHERE e.salary >= 60000' },
            { clause: 'ORDER BY', text: 'ORDER BY dept' },
            { clause: 'LIMIT', text: 'LIMIT 2' },
        ],
        join: true,
        where: { label: 'e.salary >= 60000', test: (v) => v['e.salary'] >= 60000 },
        select: [{ as: 'dept', col: 'd.name' }],
        distinct: true,
        orderBy: { key: 'dept', desc: false, alias: true },
        limit: 2,
    },
    {
        id: 'alias', name: 'Alias in WHERE',
        lines: [
            { clause: 'SELECT', text: 'SELECT e.name, e.salary / 12 AS monthly' },
            { clause: 'FROM', text: 'FROM employees e' },
            { clause: 'WHERE', text: 'WHERE monthly > 6000' },
            { clause: 'ORDER BY', text: 'ORDER BY monthly DESC' },
        ],
        join: false,
        where: { label: 'monthly > 6000', alias: 'monthly', fix: 'e.salary / 12 > 6000' },
        select: [{ as: 'name', col: 'e.name' }, { as: 'monthly', expr: (v) => Math.round(v['e.salary'] / 12) }],
        orderBy: { key: 'monthly', desc: true, alias: true },
    },
    {
        id: 'fixed', name: 'Alias, fixed',
        lines: [
            { clause: 'SELECT', text: 'SELECT e.name, e.salary / 12 AS monthly' },
            { clause: 'FROM', text: 'FROM employees e' },
            { clause: 'WHERE', text: 'WHERE e.salary / 12 > 6000' },
            { clause: 'ORDER BY', text: 'ORDER BY monthly DESC' },
        ],
        join: false,
        where: { label: 'e.salary / 12 > 6000', test: (v) => v['e.salary'] / 12 > 6000 },
        select: [{ as: 'name', col: 'e.name' }, { as: 'monthly', expr: (v) => Math.round(v['e.salary'] / 12) }],
        orderBy: { key: 'monthly', desc: true, alias: true },
    },
];

/* A line can carry two clauses: SELECT DISTINCT is written as one. */
const clausesOf = (q) => LOGICAL.filter(c => q.lines.some(l => l.clause === c || l.also === c));
const fmtNum = (v) => (typeof v === 'number' ? String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : v);

function randomData(rand = Math.random) {
    return {
        employees: DATA.employees.map(e => ({ ...e, dept: 1 + Math.floor(rand() * 5), salary: (35 + Math.floor(rand() * 65)) * 1000 })),
        departments: DATA.departments,
    };
}

function generateSteps(query, data = DATA) {
    const steps = [];
    const counts = {};
    const ran = [];
    let cols = [];
    let rows = [];
    let groups = null;
    const push = (stage, kind, explanation, extra = {}) => steps.push({
        query, stage, kind, explanation, error: null,
        cols: [...cols], rows: rows.map(r => ({ ...r, vals: { ...r.vals } })),
        groups: groups ? groups.map(g => ({ ...g })) : null, counts: { ...counts }, ran: [...ran], ...extra,
    });
    const clear = () => { rows = rows.filter(r => !r.marked).map(r => ({ ...r, marked: false })); };
    const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

    push('intro', 'intro', 'You write a query starting with SELECT, but the database evaluates its clauses in a different, logical order. Each clause takes the table the previous one produced and hands a new table on.');

    cols = ['e.id', 'e.name', 'e.dept_id', 'e.salary'];
    rows = data.employees.map(e => ({ id: `e${e.id}`, vals: { 'e.id': e.id, 'e.name': e.name, 'e.dept_id': e.dept, 'e.salary': e.salary }, marked: false }));
    ran.push('FROM');
    counts.FROM = rows.length;
    push('FROM', 'apply', `FROM runs first and produces every row of employees: ${plural(rows.length, 'row')}. Nothing has been filtered, grouped or named yet.`);

    if (query.join) {
        const deptOf = (r) => data.departments.find(d => d.id === r.vals['e.dept_id']);
        rows.forEach(r => { r.marked = !deptOf(r); });
        const lost = rows.filter(r => r.marked).map(r => r.vals['e.name']);
        push('JOIN', 'mark', `JOIN pairs each employee with the department whose id equals its dept_id. ${lost.length ? `${lost.join(', ')} ${lost.length > 1 ? 'have' : 'has'} no matching department, so this inner join drops ${lost.length > 1 ? 'them' : 'that row'}.` : 'Every employee has a matching department.'}`);
        clear();
        rows = rows.map(r => { const d = deptOf(r); return { ...r, vals: { ...r.vals, 'd.id': d.id, 'd.name': d.name } }; });
        cols = [...cols, 'd.id', 'd.name'];
        ran.push('JOIN');
        counts.JOIN = rows.length;
        push('JOIN', 'apply', `${plural(rows.length, 'joined row')}, each now carrying its department's columns as well.`);
    }

    if (query.where) {
        if (query.where.alias) {
            ran.push('WHERE');
            push('WHERE', 'error', `ERROR: column "${query.where.alias}" does not exist. WHERE runs long before SELECT, so while WHERE is checking rows the alias ${query.where.alias} has not been computed — it only exists in SELECT's output. Repeat the expression instead: WHERE ${query.where.fix}.`,
                { error: `column "${query.where.alias}" does not exist` });
            return steps;
        }
        rows.forEach(r => { r.marked = !query.where.test(r.vals); });
        const fail = rows.filter(r => r.marked).length;
        push('WHERE', 'mark', `WHERE ${query.where.label} is checked against each row on its own: ${plural(fail, 'row')} ${fail === 1 ? 'fails' : 'fail'}.`);
        clear();
        ran.push('WHERE');
        counts.WHERE = rows.length;
        push('WHERE', 'apply', `${plural(rows.length, 'row')} survive. WHERE sees individual rows only — no groups to count, and no SELECT aliases.`);
    }

    if (query.groupBy) {
        const keyOf = (r) => query.groupBy.map(c => r.vals[c]).join(', ');
        const order = [];
        rows.forEach(r => { const k = keyOf(r); if (!order.includes(k)) order.push(k); });
        rows = [...rows].sort((a, b) => order.indexOf(keyOf(a)) - order.indexOf(keyOf(b))).map(r => ({ ...r, group: keyOf(r) }));
        groups = order.map((k, i) => ({ key: k, size: rows.filter(r => r.group === k).length, color: i, marked: false }));
        ran.push('GROUP BY');
        counts['GROUP BY'] = groups.length;
        push('GROUP BY', 'apply', `GROUP BY ${query.groupBy.join(', ')} gathers the rows into ${plural(groups.length, 'group')}: ${groups.map(g => `${g.key} (${g.size})`).join(', ')}. From now on each group will become a single output row.`);
    }

    if (query.having) {
        groups.forEach(g => { g.marked = !query.having.test(rows.filter(r => r.group === g.key)); });
        rows.forEach(r => { r.marked = groups.find(g => g.key === r.group).marked; });
        const failing = groups.filter(g => g.marked).map(g => g.key);
        push('HAVING', 'mark', `HAVING ${query.having.label} tests each group as a whole — COUNT(*) is the size of the group. ${failing.length ? `${failing.join(', ')} ${failing.length > 1 ? 'fail' : 'fails'}.` : 'Every group passes.'} This is the filter that can see aggregates, because the groups exist now.`);
        clear();
        groups = groups.filter(g => !g.marked);
        ran.push('HAVING');
        counts.HAVING = groups.length;
        push('HAVING', 'apply', `${plural(groups.length, 'group')} left.`);
    }

    const grouped = Boolean(groups);
    const aliases = query.select.map(s => s.as);
    if (grouped) {
        rows = groups.map(g => {
            const members = rows.filter(r => r.group === g.key);
            const vals = {};
            for (const s of query.select) {
                if (s.agg === 'COUNT') vals[s.as] = members.length;
                else if (s.agg === 'AVG') vals[s.as] = Math.round(members.reduce((n, r) => n + r.vals[s.col], 0) / members.length);
                else vals[s.as] = members[0].vals[s.col];
            }
            return { id: `g:${g.key}`, vals, marked: false, group: g.key };
        });
    } else {
        rows = rows.map(r => ({ id: r.id, marked: false, vals: Object.fromEntries(query.select.map(s => [s.as, s.expr ? s.expr(r.vals) : r.vals[s.col]])) }));
    }
    cols = aliases;
    ran.push('SELECT');
    counts.SELECT = rows.length;
    push('SELECT', 'apply', `Only now does SELECT run, computing the output columns${grouped ? ' — one row per group, with COUNT and AVG evaluated over each group' : ''}. The names ${aliases.join(', ')} exist from this moment on, so only the clauses still to come can refer to them.`);
    groups = null;

    if (query.distinct) {
        const seen = new Set();
        rows.forEach(r => { const k = JSON.stringify(cols.map(c => r.vals[c])); r.marked = seen.has(k); seen.add(k); });
        const dups = rows.filter(r => r.marked).length;
        push('DISTINCT', 'mark', `DISTINCT compares whole output rows, which is why it has to wait for SELECT: ${plural(dups, 'duplicate')} found.`);
        clear();
        ran.push('DISTINCT');
        counts.DISTINCT = rows.length;
        push('DISTINCT', 'apply', `${plural(rows.length, 'distinct row')} left.`);
    }

    if (query.orderBy) {
        const { key, desc } = query.orderBy;
        rows = [...rows].sort((a, b) => {
            const x = a.vals[key], y = b.vals[key];
            const cmp = typeof x === 'number' ? x - y : String(x).localeCompare(String(y));
            return desc ? -cmp : cmp;
        });
        ran.push('ORDER BY');
        counts['ORDER BY'] = rows.length;
        push('ORDER BY', 'apply', `ORDER BY ${key}${desc ? ' DESC' : ''} sorts the output. It runs after SELECT, so the alias ${key} is available here — the same name that fails in WHERE.`);
    }

    if (query.limit !== undefined) {
        rows.forEach((r, i) => { r.marked = i >= query.limit; });
        push('LIMIT', 'mark', `LIMIT ${query.limit} keeps the first ${plural(query.limit, 'row')} of the sorted output and throws the rest away. It comes last, because "first" only means something once the rows are in order.`);
        clear();
        ran.push('LIMIT');
        counts.LIMIT = rows.length;
        push('LIMIT', 'apply', `${plural(rows.length, 'row')} returned.`);
    }

    push('done', 'done', `Result: ${plural(rows.length, 'row')}. ${clausesOf(query).map(c => `${c} ${counts[c]}`).join(' → ')} — every clause worked on what the one before it left behind.`);
    return steps;
}

/* The next clause, which only someone who knows the logical order can name;
   and, where the next clause uses a SELECT alias, whether that works. */
const predictFor = (step, next) => {
    if (!step || !next || next.stage === step.stage || !LOGICAL.includes(next.stage)) return null;
    const q = step.query;
    const alias = next.stage === 'WHERE' && q.where?.alias ? q.where.alias
        : next.stage === 'ORDER BY' && q.orderBy?.alias ? q.orderBy.key : null;
    if (alias) {
        const fails = next.kind === 'error';
        return {
            question: `${next.stage} runs next and refers to ${alias}, an alias defined in SELECT. What happens?`,
            options: ['The alias works', `Error: ${alias} does not exist yet`],
            correct: fails ? 1 : 0,
            because: fails ? 'WHERE runs before SELECT, so the alias has not been computed yet.' : 'ORDER BY runs after SELECT, so the alias already exists.',
        };
    }
    const remaining = clausesOf(q).filter(c => !step.ran.includes(c));
    if (remaining.length < 2) return null;
    const options = [...remaining].sort();
    return {
        question: step.kind === 'intro' ? 'Which clause does the database evaluate first?' : `${step.stage} is done. Which clause runs next?`,
        options,
        correct: options.indexOf(next.stage),
        because: step.kind === 'intro'
            ? 'FROM comes first: nothing can be filtered, grouped or selected until there are rows.'
            : `${next.stage} comes straight after ${step.stage} in SQL’s logical order.`,
    };
};

const quizQuestions = [
    {
        question: 'Why does WHERE COUNT(*) > 2 fail, while HAVING COUNT(*) > 2 works?',
        options: [
            'COUNT is not allowed in WHERE for performance reasons',
            'WHERE runs before GROUP BY, so there are no groups to count yet',
            'HAVING is just an alias for WHERE',
            'WHERE only accepts constants',
        ],
        correct: 1,
        explanation: 'WHERE filters individual rows before they are grouped. HAVING runs after GROUP BY, when each group exists and its aggregates can be computed.',
    },
    {
        question: 'Which clauses can use an alias defined in SELECT?',
        options: ['WHERE and GROUP BY', 'ORDER BY (it runs after SELECT)', 'FROM', 'All of them'],
        correct: 1,
        explanation: 'Aliases are created when SELECT runs. Only ORDER BY (and, in some databases, LIMIT expressions) comes later. Some systems such as MySQL and PostgreSQL also accept aliases in GROUP BY as an extension.',
    },
    {
        question: 'In what logical order are these evaluated: SELECT, WHERE, ORDER BY, FROM?',
        options: ['SELECT, FROM, WHERE, ORDER BY', 'FROM, WHERE, SELECT, ORDER BY', 'FROM, SELECT, WHERE, ORDER BY', 'WHERE, FROM, ORDER BY, SELECT'],
        correct: 1,
        explanation: 'FROM builds the rows, WHERE filters them, SELECT computes the output columns, and ORDER BY sorts the result. The optimizer may physically reorder work, but it must produce this logical result.',
    },
];

const GROUP_TONES = ['border-l-blue-400 bg-blue-500/10', 'border-l-amber-400 bg-amber-500/10', 'border-l-teal-400 bg-teal-500/10', 'border-l-violet-400 bg-violet-500/10', 'border-l-pink-400 bg-pink-500/10'];

function SqlQueryOrderPage() {
    const [queryId, setQueryId] = useState('report');
    const [data, setData] = useState(DATA);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1300);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const query = QUERIES.find(q => q.id === queryId);

    useEffect(() => {
        setStepHistory(generateSteps(QUERIES.find(q => q.id === queryId), data));
        setCurrentStep(0);
    }, [queryId, data]);

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
    const shuffle = () => { setIsPlaying(false); setData(randomData()); };

    const step = stepHistory[currentStep];
    const clauses = clausesOf(query);
    // With predictions on, the order of clauses not yet run stays hidden.
    const reveal = !predict.enabled;

    const handleQuizAnswer = (idx) => {
        if (quizState.answered) return;
        const correct = idx === quizQuestions[quizState.current].correct;
        setQuizState(s => ({ ...s, selected: idx, answered: true, score: correct ? s.score + 1 : s.score }));
    };
    const nextQuestion = () => {
        if (quizState.current + 1 >= quizQuestions.length) setQuizState(s => ({ ...s, complete: true }));
        else setQuizState(s => ({ ...s, current: s.current + 1, selected: null, answered: false }));
    };

    const codeExample = `-- Written order          -- Logical order
SELECT dept, COUNT(*)      -- 5. compute output columns, aliases born here
FROM employees e           -- 1. produce rows
JOIN departments d         -- 1. (part of FROM) pair them up
  ON e.dept_id = d.id
WHERE e.salary > 50000     -- 2. filter rows      (no aliases, no aggregates)
GROUP BY d.name            -- 3. form groups
HAVING COUNT(*) >= 2       -- 4. filter groups    (aggregates allowed)
ORDER BY dept              -- 6. sort             (aliases allowed)
LIMIT 10;                  -- 7. cut

-- Fails: the alias does not exist when WHERE runs
SELECT salary / 12 AS monthly FROM employees WHERE monthly > 6000;

-- Works: repeat the expression, or wrap the query
SELECT * FROM (
    SELECT name, salary / 12 AS monthly FROM employees
) t
WHERE monthly > 6000;`;

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
                            <ListOrdered className="h-10 w-10" />SQL Query Order
                        </h1>
                        <p className="text-xl text-blue-100 mb-6 max-w-3xl mx-auto">
                            SQL is written SELECT-first but evaluated FROM-first. Follow the rows through every clause in logical order and the rules about aliases and aggregates stop being arbitrary.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">9 clauses</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">One table in, one table out</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Aliases born in SELECT</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6 mb-6">
                            <div className="flex flex-wrap items-center gap-2 mb-5">
                                <span className="text-xs uppercase tracking-wide text-slate-500 mr-1">Query</span>
                                {QUERIES.map(q => (
                                    <button key={q.id} onClick={() => { setIsPlaying(false); setQueryId(q.id); }}
                                        className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${q.id === queryId ? 'bg-blue-500/20 border-blue-400 text-blue-200' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                                        {q.name}
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
                                    <span className="text-sm text-slate-500">{step && step.stage !== 'intro' && step.stage !== 'done' ? step.stage : ''}</span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-2">
                                    <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: `${((currentStep + 1) / Math.max(stepHistory.length, 1)) * 100}%` }} />
                                </div>
                            </div>

                            {step && (
                                <div className="space-y-4 mb-5">
                                    {/* The query as written, numbered in the order it runs */}
                                    <div className="bg-slate-950 rounded-lg border border-slate-700/60 p-3 font-mono text-[12px] space-y-1">
                                        {query.lines.map((l, k) => {
                                            const mine = [l.clause, ...(l.also ? [l.also] : [])];
                                            const done = mine.some(c => step.ran.includes(c));
                                            const current = mine.includes(step.stage);
                                            return (
                                                <div key={k} className={`flex items-center gap-2 rounded px-1.5 py-0.5 transition-colors ${current ? (step.kind === 'error' ? 'bg-red-500/20' : 'bg-blue-500/20') : ''}`}>
                                                    {mine.map(c => {
                                                        const ran = step.ran.includes(c), now = step.stage === c;
                                                        return (
                                                            <span key={c} title={c} className={`w-5 h-5 flex-shrink-0 rounded-full text-[10px] font-bold flex items-center justify-center ${ran || reveal ? (now ? 'bg-blue-400 text-slate-900' : ran ? 'bg-teal-600 text-white' : 'bg-slate-700 text-slate-300') : 'bg-slate-800 text-slate-600'}`}>
                                                                {ran || reveal ? clauses.indexOf(c) + 1 : '?'}
                                                            </span>
                                                        );
                                                    })}
                                                    <span className={current ? 'text-blue-100' : done ? 'text-slate-300' : 'text-slate-500'}>{l.text}</span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* The pipeline: rows left after each clause */}
                                    <div className="flex flex-wrap items-center gap-1">
                                        {clauses.map((cl, k) => {
                                            const done = step.ran.includes(cl);
                                            const current = step.stage === cl;
                                            const n = step.counts[cl];
                                            return (
                                                <React.Fragment key={cl}>
                                                    {k > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-600" />}
                                                    <div className={`px-2 py-1 rounded-md border text-center transition-colors ${current ? (step.kind === 'error' ? 'border-red-400 bg-red-500/15' : 'border-blue-400 bg-blue-500/15') : done ? 'border-teal-600/60 bg-teal-500/10' : 'border-slate-700 bg-slate-800/40'}`}>
                                                        <div className={`text-[10px] font-semibold ${current ? 'text-blue-200' : done ? 'text-teal-200' : 'text-slate-500'}`}>{done || current || reveal ? cl : '?'}</div>
                                                        <div className="text-[10px] font-mono text-slate-400">{n !== undefined ? `${n} ${cl === 'GROUP BY' || cl === 'HAVING' ? 'grp' : 'rows'}` : '—'}</div>
                                                    </div>
                                                </React.Fragment>
                                            );
                                        })}
                                    </div>

                                    {/* The table in flight */}
                                    {step.error ? (
                                        <div className="rounded-lg border border-red-500 bg-red-500/10 p-4 flex items-start gap-3">
                                            <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <div className="font-mono text-sm text-red-200">ERROR: {step.error}</div>
                                                <div className="text-xs text-red-300/80 mt-1">The query stops here. Nothing after WHERE ever runs.</div>
                                            </div>
                                        </div>
                                    ) : step.kind !== 'intro' && (
                                        <div className="bg-slate-800/50 rounded-lg border border-slate-700/60 p-3 overflow-x-auto">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="text-slate-400 text-left">
                                                        {step.cols.map(c => <th key={c} className="font-mono font-semibold pb-1 pr-3 whitespace-nowrap">{c}</th>)}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {step.rows.map(r => {
                                                        const g = step.groups && r.group !== undefined ? step.groups.find(x => x.key === r.group) : null;
                                                        const tone = r.marked ? 'bg-red-500/15 text-red-300 line-through' : g ? `border-l-4 ${GROUP_TONES[g.color % GROUP_TONES.length]} text-slate-200` : 'text-slate-200';
                                                        return (
                                                            <tr key={r.id} className={`border-t border-slate-700/50 transition-colors duration-300 ${tone}`}>
                                                                {step.cols.map(c => <td key={c} className="py-1 pr-3 font-mono whitespace-nowrap">{fmtNum(r.vals[c])}</td>)}
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                            {step.groups && (
                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                    {step.groups.map(g => (
                                                        <span key={g.key} className={`text-[10px] px-1.5 py-0.5 rounded border-l-4 ${GROUP_TONES[g.color % GROUP_TONES.length]} ${g.marked ? 'line-through text-red-300' : 'text-slate-300'}`}>
                                                            group {g.key}: {g.size}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
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
                                <h3 className="font-bold text-white">What Each Clause Can See</h3>
                            </div>
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="text-slate-500 text-left">
                                        <th className="font-medium pb-2">Clause</th>
                                        <th className="font-medium pb-2">Aggregates</th>
                                        <th className="font-medium pb-2">Aliases</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[['WHERE', 'no', 'no'], ['GROUP BY', 'no', 'no*'], ['HAVING', 'yes', 'no*'], ['SELECT', 'yes', 'defines them'], ['ORDER BY', 'yes', 'yes']].map(([cl, agg, al]) => (
                                        <tr key={cl} className={`border-t border-slate-800 ${step && step.stage === cl ? 'bg-blue-500/10' : ''}`}>
                                            <td className="py-1.5 font-mono text-slate-300">{cl}</td>
                                            <td className={`py-1.5 ${agg === 'yes' ? 'text-green-400' : 'text-red-400'}`}>{agg}</td>
                                            <td className={`py-1.5 ${al.startsWith('yes') || al === 'defines them' ? 'text-green-400' : 'text-red-400'}`}>{al}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                                * MySQL and PostgreSQL accept SELECT aliases in GROUP BY (and MySQL in HAVING) as an extension; standard SQL does not. The optimizer may reorder the physical work — pushing filters down, for instance — but never the logical result.
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

export default SqlQueryOrderPage;
