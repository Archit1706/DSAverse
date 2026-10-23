"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Shuffle, Info, Code2, Merge, Clock, CheckCircle } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';
import { usePredict, PredictToggle, PredictPrompt } from '@/components/PredictStep';

/* employees ⋈ departments ON employees.dept = departments.dept */
const DEFAULT_R = [
    { name: 'Ana', dept: 20 }, { name: 'Ben', dept: 10 }, { name: 'Cara', dept: 30 },
    { name: 'Dev', dept: 20 }, { name: 'Eli', dept: 40 }, { name: 'Fay', dept: 10 },
];
const DEFAULT_S = [
    { dept: 10, dname: 'Sales' }, { dept: 20, dname: 'Eng' }, { dept: 30, dname: 'Ops' }, { dept: 50, dname: 'Legal' },
];
const NAMES = ['Ana', 'Ben', 'Cara', 'Dev', 'Eli', 'Fay', 'Gus', 'Hana'];
const DNAMES = { 10: 'Sales', 20: 'Eng', 30: 'Ops', 40: 'HR', 50: 'Legal', 60: 'Ads', 70: 'Data', 80: 'Labs', 90: 'Ship' };

const ALGOS = [
    { id: 'nlj', name: 'Nested loop' },
    { id: 'hash', name: 'Hash join' },
    { id: 'merge', name: 'Sort-merge' },
];

const BUCKETS = 4;
const bucketOf = (k) => (k / 10) % BUCKETS;

function randomTables(rand = Math.random) {
    const depts = [10, 20, 30, 40, 50, 60, 70, 80, 90];
    const pool = [...depts].sort(() => rand() - 0.5);
    const S = pool.slice(0, 3 + Math.floor(rand() * 3)).map(d => ({ dept: d, dname: DNAMES[d] }));
    const nR = 5 + Math.floor(rand() * 3);
    const R = NAMES.slice(0, nR).map(name => ({ name, dept: rand() < 0.75 ? S[Math.floor(rand() * S.length)].dept : depts[Math.floor(rand() * depts.length)] }));
    return { R, S };
}

/** Merge sort on .dept that counts its comparisons; returns original indices. */
function sortCounting(rows) {
    let count = 0;
    const sort = (idx) => {
        if (idx.length <= 1) return idx;
        const mid = idx.length >> 1;
        const a = sort(idx.slice(0, mid)), b = sort(idx.slice(mid));
        const out = [];
        let i = 0, j = 0;
        while (i < a.length && j < b.length) {
            count++;
            if (rows[a[i]].dept <= rows[b[j]].dept) out.push(a[i++]); else out.push(b[j++]);
        }
        return [...out, ...a.slice(i), ...b.slice(j)];
    };
    const order = sort(rows.map((_, i) => i));
    return { order, count };
}

function generateSteps(R, S, algo) {
    const steps = [];
    const output = [];
    let comparisons = 0;
    const base = { algo, rOrder: R.map((_, i) => i), sOrder: S.map((_, i) => i), buckets: null, ri: null, si: null, bucket: null, match: null, sortCost: 0 };
    let state = { ...base };
    const push = (data, explanation) => {
        state = { ...state, ...data };
        steps.push({ ...state, R, S, output: output.map(p => [...p]), comparisons, explanation, buckets: state.buckets ? state.buckets.map(b => [...b]) : null });
    };
    const label = (i) => `${R[i].name} (${R[i].dept})`;
    const dlabel = (j) => `${S[j].dname} (${S[j].dept})`;

    if (algo === 'nlj') {
        push({ phase: 'intro' }, `Nested-loop join: for every employee, scan every department and compare the keys. ${R.length} × ${S.length} = ${R.length * S.length} comparisons, whatever the data looks like.`);
        R.forEach((r, i) => S.forEach((s, j) => {
            comparisons++;
            const match = r.dept === s.dept;
            if (match) output.push([i, j]);
            push({ phase: 'compare', ri: i, si: j, match },
                match ? `${label(i)} vs ${dlabel(j)}: keys match — output (${r.name}, ${s.dname}).`
                    : `${label(i)} vs ${dlabel(j)}: ${r.dept} ≠ ${s.dept}, no match.${j === S.length - 1 && !output.some(p => p[0] === i) ? ` ${r.name} matched nothing, but every department still had to be checked.` : ''}`);
        }));
        push({ phase: 'done', ri: null, si: null, match: null }, `Done: ${output.length} rows from ${comparisons} comparisons — every pair was compared, even the ones that could never match.`);
        return steps;
    }

    if (algo === 'hash') {
        const buckets = Array.from({ length: BUCKETS }, () => []);
        push({ phase: 'intro', buckets }, `Hash join: build a hash table on the smaller input (departments), then probe it once per employee. h(k) = (k ÷ 10) mod ${BUCKETS}.`);
        S.forEach((s, j) => {
            const b = bucketOf(s.dept);
            buckets[b].push(j);
            push({ phase: 'build', si: j, ri: null, bucket: b, buckets, match: null },
                `Build: ${dlabel(j)} hashes to h(${s.dept}) = ${b}, so it goes into bucket ${b}${buckets[b].length > 1 ? ` — which already holds ${buckets[b].slice(0, -1).map(x => S[x].dname).join(', ')}, a collision` : ''}. No comparisons yet.`);
        });
        R.forEach((r, i) => {
            const b = bucketOf(r.dept);
            const entries = buckets[b];
            push({ phase: 'probe', ri: i, si: null, bucket: b, match: null },
                entries.length
                    ? `Probe: ${label(i)} hashes to bucket ${b}. Only the ${entries.length} ${entries.length > 1 ? 'entries' : 'entry'} there can possibly match; the rest of the table is never looked at.`
                    : `Probe: ${label(i)} hashes to bucket ${b}, which is empty — ${r.name} has no match, decided without a single comparison.`);
            entries.forEach(j => {
                comparisons++;
                const match = r.dept === S[j].dept;
                if (match) output.push([i, j]);
                push({ phase: 'probe-compare', ri: i, si: j, bucket: b, match },
                    match ? `${r.dept} = ${S[j].dept}: output (${r.name}, ${S[j].dname}).`
                        : `${r.dept} vs ${S[j].dept}: same bucket, different key. Hashing only narrows the search, so the keys themselves are still compared.`);
            });
        });
        push({ phase: 'done', ri: null, si: null, bucket: null, match: null }, `Done: ${output.length} rows from ${comparisons} comparisons, plus one hash per row. Hash join is O(n + m) — as long as the build side fits in memory.`);
        return steps;
    }

    // sort-merge
    push({ phase: 'intro' }, 'Sort-merge join: sort both inputs on the join key, then walk them side by side with one pointer each. Equal keys produce output; otherwise the pointer on the smaller key moves on.');
    const sr = sortCounting(R), ss = sortCounting(S);
    comparisons += sr.count;
    push({ phase: 'sort', rOrder: sr.order, sortCost: sr.count }, `Sort employees by dept: ${sr.count} comparisons (merge sort). If an index already delivered them in order, this would be free.`);
    comparisons += ss.count;
    push({ phase: 'sort', sOrder: ss.order, sortCost: sr.count + ss.count }, `Sort departments by dept: ${ss.count} comparisons. Now the merge.`);
    const Rs = sr.order, Ss = ss.order;
    let i = 0, j = 0;
    while (i < Rs.length && j < Ss.length) {
        const rk = R[Rs[i]].dept, sk = S[Ss[j]].dept;
        comparisons++;
        push({ phase: 'compare', ri: Rs[i], si: Ss[j], pi: i, pj: j, match: null }, `Compare employee key ${rk} (${R[Rs[i]].name}) with department key ${sk} (${S[Ss[j]].dname}).`);
        if (rk < sk) {
            i++;
            push({ phase: 'advance-r', pi: i, ri: i < Rs.length ? Rs[i] : null }, `${rk} < ${sk}. Departments are sorted, so nothing further right can equal ${rk}: ${R[Rs[i - 1]].name} has no match. Move the employee pointer.`);
        } else if (rk > sk) {
            j++;
            push({ phase: 'advance-s', pj: j, si: j < Ss.length ? Ss[j] : null }, `${rk} > ${sk}. No remaining employee can have key ${sk}, so ${S[Ss[j - 1]].dname} is done. Move the department pointer.`);
        } else {
            const mark = j;
            const run = [];
            output.push([Rs[i], Ss[j]]); run.push(Ss[j]); j++;
            while (j < Ss.length) {
                comparisons++;
                if (S[Ss[j]].dept !== rk) break;
                output.push([Rs[i], Ss[j]]); run.push(Ss[j]); j++;
            }
            push({ phase: 'match', match: true, pj: j, si: run[run.length - 1] }, `${rk} = ${sk}: output ${run.map(x => `(${R[Rs[i]].name}, ${S[x].dname})`).join(', ')}. The department pointer moves past every department with key ${rk}.`);
            i++;
            if (i < Rs.length) {
                comparisons++;
                if (R[Rs[i]].dept === rk) {
                    j = mark;
                    push({ phase: 'rewind', pi: i, pj: j, ri: Rs[i], si: Ss[j], match: null }, `${R[Rs[i]].name} also has key ${rk}, so the department pointer goes back to the first ${rk} — duplicates on both sides are why merge join has to remember where a run started.`);
                    continue;
                }
            }
            push({ phase: 'advance-r', pi: i, ri: i < Rs.length ? Rs[i] : null, match: null }, `Move the employee pointer${i < Rs.length ? ` to ${R[Rs[i]].name}` : ' — past the last employee'}.`);
        }
    }
    push({ phase: 'done', ri: null, si: null, match: null }, `Done: ${output.length} rows. ${comparisons - sr.count - ss.count} merge comparisons plus ${sr.count + ss.count} to sort. The output comes out sorted by dept for free — handy for a following ORDER BY or GROUP BY.`);
    return steps;
}

/* Two decisions the screen settles: which bucket a key hashes to (the
   function is printed above the buckets), and which way a merge moves. */
const predictFor = (step, next) => {
    if (!step || !next) return null;
    if ((next.phase === 'build' || next.phase === 'probe') && next.bucket !== null) {
        const key = next.phase === 'build' ? next.S[next.si].dept : next.R[next.ri].dept;
        const who = next.phase === 'build' ? `Department ${next.S[next.si].dname}` : `Employee ${next.R[next.ri].name}`;
        return {
            question: `${who} has key ${key}. With h(k) = (k ÷ 10) mod ${BUCKETS}, which bucket does it ${next.phase === 'build' ? 'go into' : 'probe'}?`,
            options: Array.from({ length: BUCKETS }, (_, b) => `Bucket ${b}`),
            correct: next.bucket,
            because: `${key} ÷ 10 = ${key / 10}, and ${key / 10} mod ${BUCKETS} = ${next.bucket}.`,
        };
    }
    if (step.phase === 'compare' && step.algo === 'merge') {
        const rk = step.R[step.ri].dept, sk = step.S[step.si].dept;
        const options = ['Advance the employee pointer', 'Advance the department pointer', 'Keys match — output rows'];
        const correct = next.phase === 'advance-r' ? 0 : next.phase === 'advance-s' ? 1 : 2;
        return {
            question: `Employee key ${rk}, department key ${sk}. What does the merge do?`,
            options,
            correct,
            because: correct === 2 ? 'Equal keys join.' : `The pointer on the smaller key (${Math.min(rk, sk)}) moves: both lists are sorted, so that key can never match anything further along the other list.`,
        };
    }
    return null;
};

const quizQuestions = [
    {
        question: 'Two tables of 10,000 rows each are joined on an equality condition, with no indexes and plenty of memory. Which join is usually fastest?',
        options: ['Nested-loop join', 'Hash join', 'Sort-merge join', 'They are always equal'],
        correct: 1,
        explanation: 'Hash join reads each table once — build on one, probe with the other — for O(n + m) work. Nested loop needs 100 million comparisons; sort-merge pays O(n log n) to sort first.',
    },
    {
        question: 'When does sort-merge join beat hash join?',
        options: [
            'When the inputs already arrive sorted on the join key, for example from an index',
            'When the tables are tiny',
            'When the join condition is a hash',
            'Never',
        ],
        correct: 0,
        explanation: 'If both inputs are already sorted, the merge is a single linear pass with no hash table to build — and the output is sorted too, which a later ORDER BY or GROUP BY can use.',
    },
    {
        question: 'Why does hash join still compare keys after hashing them?',
        options: [
            'To count the rows',
            'Different keys can land in the same bucket (collisions)',
            'Hash functions are random',
            'It does not — hashing is enough',
        ],
        correct: 1,
        explanation: 'A bucket narrows the candidates, but keys that collide share a bucket. Each candidate must still be checked for equality before it is output.',
    },
];

function RowTable({ title, rows, cols, order, active, pointer, dim, matched }) {
    return (
        <div className="bg-slate-800/50 rounded-lg border border-slate-700/60 p-3">
            <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">{title}</div>
            <table className="w-full text-xs">
                <thead>
                    <tr className="text-slate-500">
                        <th className="w-4" />
                        {cols.map(c => <th key={c.key} className="text-left font-medium pb-1">{c.label}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {order.map((idx, pos) => {
                        const on = active === idx;
                        const tone = on
                            ? (matched === true ? 'bg-green-500/20 text-green-200' : matched === false ? 'bg-yellow-400/15 text-yellow-100' : 'bg-blue-500/20 text-blue-100')
                            : dim && dim(idx) ? 'text-slate-600' : 'text-slate-300';
                        return (
                            <tr key={idx} className={`transition-colors duration-300 ${tone}`}>
                                <td className="text-blue-400 font-bold">{pointer === pos ? '▶' : ''}</td>
                                {cols.map(c => <td key={c.key} className={`py-1 ${c.key === 'dept' ? 'font-mono font-semibold' : ''}`}>{rows[idx][c.key]}</td>)}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function JoinAlgorithmsPage() {
    const [tables, setTables] = useState({ R: DEFAULT_R, S: DEFAULT_S });
    const [algo, setAlgo] = useState('nlj');
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(700);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    useEffect(() => {
        setStepHistory(generateSteps(tables.R, tables.S, algo));
        setCurrentStep(0);
    }, [tables, algo]);

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

    const totals = useMemo(() => Object.fromEntries(ALGOS.map(a => {
        const st = generateSteps(tables.R, tables.S, a.id);
        return [a.id, st[st.length - 1].comparisons];
    })), [tables]);
    const maxTotal = Math.max(...Object.values(totals), 1);

    const shuffle = () => { setIsPlaying(false); setTables(randomTables()); };
    const reset = () => { setIsPlaying(false); setCurrentStep(0); };

    const step = stepHistory[currentStep];
    const matchedR = step ? new Set(step.output.map(p => p[0])) : new Set();

    const handleQuizAnswer = (idx) => {
        if (quizState.answered) return;
        const correct = idx === quizQuestions[quizState.current].correct;
        setQuizState(s => ({ ...s, selected: idx, answered: true, score: correct ? s.score + 1 : s.score }));
    };
    const nextQuestion = () => {
        if (quizState.current + 1 >= quizQuestions.length) setQuizState(s => ({ ...s, complete: true }));
        else setQuizState(s => ({ ...s, current: s.current + 1, selected: null, answered: false }));
    };

    const codeExample = `def nested_loop_join(R, S, key):
    return [(r, s) for r in R for s in S if r[key] == s[key]]

def hash_join(R, S, key):
    table = {}
    for s in S:                          # build on the smaller input
        table.setdefault(s[key], []).append(s)
    return [(r, s) for r in R            # probe once per row
                   for s in table.get(r[key], [])]

def sort_merge_join(R, S, key):
    R, S = sorted(R, key=lambda r: r[key]), sorted(S, key=lambda s: s[key])
    out, i, j = [], 0, 0
    while i < len(R) and j < len(S):
        if R[i][key] < S[j][key]:
            i += 1
        elif R[i][key] > S[j][key]:
            j += 1
        else:
            mark = j                     # remember where the run starts
            while j < len(S) and S[j][key] == R[i][key]:
                out.append((R[i], S[j])); j += 1
            i += 1
            if i < len(R) and R[i][key] == S[mark][key]:
                j = mark                 # duplicate key on the left: rewind
    return out`;

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
                            <Merge className="h-10 w-10" />Join Algorithms
                        </h1>
                        <p className="text-xl text-blue-100 mb-6 max-w-3xl mx-auto">
                            The same JOIN can be computed three ways. Run each on the same two tables and count the comparisons it spends.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Nested loop: O(n·m)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Hash: O(n + m)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Sort-merge: O(n log n + m log m)</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6 mb-6">
                            <div className="flex flex-wrap items-center gap-2 mb-5">
                                <span className="text-xs uppercase tracking-wide text-slate-500 mr-1">Algorithm</span>
                                {ALGOS.map(a => (
                                    <button key={a.id} onClick={() => { setIsPlaying(false); setAlgo(a.id); }}
                                        className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${a.id === algo ? 'bg-blue-500/20 border-blue-400 text-blue-200' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                                        {a.name}
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
                                    <Shuffle size={18} />New Tables
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
                                    <span className="text-sm font-mono text-blue-300">{step ? `${step.comparisons} comparisons` : ''}</span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-2">
                                    <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: `${((currentStep + 1) / Math.max(stepHistory.length, 1)) * 100}%` }} />
                                </div>
                            </div>

                            {step && (
                                <div className="space-y-4 mb-5">
                                    <div className={`grid grid-cols-1 gap-3 ${algo === 'hash' ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                                        <RowTable title={`employees${step.algo === 'merge' && step.rOrder.some((x, k) => x !== k) ? ' (sorted)' : ''}`}
                                            rows={step.R} cols={[{ key: 'name', label: 'name' }, { key: 'dept', label: 'dept' }]}
                                            order={step.rOrder} active={step.ri} pointer={step.algo === 'merge' && step.phase !== 'intro' && step.phase !== 'sort' ? step.pi : null}
                                            matched={step.match} dim={step.phase === 'done' ? (i => !matchedR.has(i)) : null} />
                                        {algo === 'hash' && (
                                            <div className="bg-slate-800/50 rounded-lg border border-slate-700/60 p-3">
                                                <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Hash table on departments</div>
                                                <div className="font-mono text-[10px] text-slate-400 mb-2">h(k) = (k ÷ 10) mod {BUCKETS}</div>
                                                <div className="space-y-1.5">
                                                    {(step.buckets ?? []).map((b, k) => (
                                                        <div key={k} className={`flex items-center gap-1.5 rounded px-1.5 py-1 border transition-colors ${step.bucket === k && step.phase !== 'intro' && step.phase !== 'done' ? 'border-blue-400 bg-blue-500/10' : 'border-slate-700'}`}>
                                                            <span className="text-[10px] text-slate-500 w-5">#{k}</span>
                                                            {b.length === 0 && <span className="text-[10px] text-slate-600">empty</span>}
                                                            {b.map(j => (
                                                                <span key={j} className={`text-[10px] font-mono px-1.5 py-0.5 rounded transition-colors ${step.si === j ? (step.match ? 'bg-green-500/30 text-green-200' : step.match === false ? 'bg-yellow-400/20 text-yellow-100' : 'bg-blue-500/30 text-blue-100') : 'bg-slate-700 text-slate-300'}`}>
                                                                    {step.S[j].dept}:{step.S[j].dname}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        <RowTable title={`departments${step.algo === 'merge' && step.sOrder.some((x, k) => x !== k) ? ' (sorted)' : ''}`}
                                            rows={step.S} cols={[{ key: 'dept', label: 'dept' }, { key: 'dname', label: 'name' }]}
                                            order={step.sOrder} active={step.si} pointer={step.algo === 'merge' && step.phase !== 'intro' && step.phase !== 'sort' ? step.pj : null}
                                            matched={step.match} />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="bg-slate-800/50 rounded-lg border border-slate-700/60 p-3">
                                            <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Output ({step.output.length} rows)</div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {step.output.length === 0 && <span className="text-xs text-slate-600">nothing yet</span>}
                                                {step.output.map(([i, j], k) => (
                                                    <span key={k} className={`text-[11px] font-mono px-2 py-0.5 rounded border ${k === step.output.length - 1 && step.match ? 'border-green-400 bg-green-500/20 text-green-200' : 'border-slate-600 text-slate-300'}`}>
                                                        {step.R[i].name} · {step.S[j].dname}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="bg-slate-800/50 rounded-lg border border-slate-700/60 p-3">
                                            <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Comparisons on these tables</div>
                                            <div className="space-y-1.5">
                                                {ALGOS.map(a => (
                                                    <div key={a.id} className="flex items-center gap-2 text-[11px]">
                                                        <span className={`w-20 ${a.id === algo ? 'text-blue-200 font-semibold' : 'text-slate-400'}`}>{a.name}</span>
                                                        <div className="flex-1 h-2.5 bg-slate-900 rounded">
                                                            <div className={`h-2.5 rounded ${a.id === algo ? 'bg-blue-500' : 'bg-slate-600'}`} style={{ width: `${(totals[a.id] / maxTotal) * 100}%` }} />
                                                        </div>
                                                        <span className="w-8 text-right font-mono text-slate-300">{totals[a.id]}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <p className="text-[10px] text-slate-500 mt-2">Sort-merge includes its sorting comparisons.</p>
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
                                <h3 className="font-bold text-white">When Each One Wins</h3>
                            </div>
                            <div className="space-y-3 text-sm">
                                {[
                                    ['nlj', 'Nested loop', 'Tiny inputs, join conditions that are not equalities, or an index on the inner table — an index nested-loop join turns each inner scan into one lookup.'],
                                    ['hash', 'Hash join', 'Equality joins on large, unsorted inputs, when the smaller side fits in memory. The usual winner for analytics.'],
                                    ['merge', 'Sort-merge', 'Inputs already sorted on the key (from an index or an earlier sort), inputs too big for memory, or when sorted output is wanted next.'],
                                ].map(([id, name, body]) => (
                                    <div key={id} className={`rounded-lg p-2 border transition-colors ${id === algo ? 'border-blue-400/60 bg-blue-500/10' : 'border-transparent'}`}>
                                        <div className={`flex items-center gap-1.5 font-semibold ${id === algo ? 'text-blue-200' : 'text-slate-200'}`}>
                                            {id === algo && <CheckCircle className="h-3.5 w-3.5" />}{name}
                                        </div>
                                        <div className="text-xs text-slate-400 leading-relaxed">{body}</div>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                                The query optimizer picks among these using table statistics — the same cost-based choice shown in How a Database Query Executes.
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

export default JoinAlgorithmsPage;
