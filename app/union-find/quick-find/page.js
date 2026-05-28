"use client";
import { useState, useEffect, useCallback } from 'react';
import { SkipBack, SkipForward, Play, Pause, RotateCcw, Shuffle, Info } from 'lucide-react';

// Component colours (cycle through these for up to 10 components)
const COMP_COLORS = [
    'bg-purple-500 border-purple-400 text-white',
    'bg-sky-500 border-sky-400 text-white',
    'bg-emerald-500 border-emerald-400 text-white',
    'bg-amber-500 border-amber-400 text-slate-900',
    'bg-rose-500 border-rose-400 text-white',
    'bg-cyan-500 border-cyan-400 text-slate-900',
    'bg-indigo-500 border-indigo-400 text-white',
    'bg-lime-500 border-lime-400 text-slate-900',
    'bg-orange-500 border-orange-400 text-white',
    'bg-pink-500 border-pink-400 text-white',
];

// ─── Step generation ──────────────────────────────────────────────────────────

function generateSteps(n, ops) {
    const steps = [];
    const id = Array.from({ length: n }, (_, i) => i);

    // helper
    const snapshot = (extra) => ({
        id: [...id],
        scanIdx: null,
        updateIdx: null,
        activeP: null,
        activeQ: null,
        ...extra,
    });

    steps.push({
        ...snapshot(),
        explanation: `Initialise: each element is its own component. id = [${id.join(', ')}]. find(x) = id[x] — O(1).`,
    });

    for (const [p, q] of ops) {
        const pid = id[p], qid = id[q];

        if (pid === qid) {
            steps.push({
                ...snapshot({ activeP: p, activeQ: q }),
                explanation: `union(${p}, ${q}): id[${p}]=${pid} already equals id[${q}]=${qid}. Already connected — skip.`,
            });
            continue;
        }

        // Show the two nodes being checked
        steps.push({
            ...snapshot({ activeP: p, activeQ: q }),
            explanation: `union(${p}, ${q}): find(${p})=id[${p}]=${pid}, find(${q})=id[${q}]=${qid}. Different components — must relabel all ${pid}s to ${qid}.`,
        });

        // Scan each element
        for (let i = 0; i < n; i++) {
            if (id[i] === pid) {
                steps.push({
                    ...snapshot({ activeP: p, activeQ: q, scanIdx: i }),
                    explanation: `Scanning index ${i}: id[${i}]=${id[i]} matches old component ${pid} → updating to ${qid}.`,
                });
                id[i] = qid;
                steps.push({
                    ...snapshot({ activeP: p, activeQ: q, updateIdx: i }),
                    explanation: `Updated id[${i}] = ${qid}. Component ${pid} shrinking…`,
                });
            } else {
                steps.push({
                    ...snapshot({ activeP: p, activeQ: q, scanIdx: i }),
                    explanation: `Scanning index ${i}: id[${i}]=${id[i]} ≠ ${pid} — no change.`,
                });
            }
        }

        steps.push({
            ...snapshot({ activeP: p, activeQ: q }),
            explanation: `union(${p}, ${q}) complete. All former id=${pid} elements now have id=${qid}. Components merged.`,
        });
    }

    steps.push({
        ...snapshot(),
        explanation: `Done. Final id array: [${id.join(', ')}]. Components: ${[...new Set(id)].length} distinct groups.`,
        done: true,
    });

    return steps;
}

// ─── Quiz ─────────────────────────────────────────────────────────────────────

const QS = [
    {
        question: 'What is the time complexity of find() in Quick Find?',
        options: ['O(n)', 'O(log n)', 'O(1)', 'O(n²)'],
        correct: 2,
        explanation: 'find(x) simply returns id[x] — a direct array lookup, O(1).',
    },
    {
        question: 'Why is union() O(n) in Quick Find?',
        options: [
            'It must traverse a tree to the root',
            'It scans the entire array to relabel all elements in one component',
            'It allocates a new array each time',
            'It calls find() n times',
        ],
        correct: 1,
        explanation: 'union(p, q) iterates over every element and relabels those with id[p] to id[q] — unavoidably O(n).',
    },
    {
        question: 'How many components are there after n union() calls on n elements (assuming all different pairs)?',
        options: ['n', '1', 'n/2', 'Depends on which pairs'],
        correct: 1,
        explanation: 'If the union operations form a spanning tree (connect everything), exactly 1 component remains. The answer depends on which pairs are unioned.',
    },
];

function QuizPanel({ qs, setQs }) {
    if (qs.complete) return (
        <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700/50 text-center">
            <p className="text-2xl font-bold text-purple-400 mb-1">{qs.score}/{QS.length}</p>
            <p className="text-slate-400 text-sm mb-4">{qs.score === QS.length ? 'Perfect!' : 'Keep going!'}</p>
            <button onClick={() => setQs({ current: 0, selected: null, answered: false, score: 0, complete: false })}
                className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg transition-colors">Retake</button>
        </div>
    );
    const q = QS[qs.current];
    return (
        <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700/50 space-y-3">
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Active Recall</span>
                <span className="text-xs text-slate-500">{qs.current + 1}/{QS.length}</span>
            </div>
            <p className="text-slate-200 text-sm font-medium leading-snug">{q.question}</p>
            <div className="space-y-2">
                {q.options.map((opt, i) => {
                    let cls = 'w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ';
                    if (!qs.answered) cls += 'border-slate-600 text-slate-300 hover:border-purple-500 cursor-pointer';
                    else if (i === q.correct) cls += 'border-green-500 bg-green-500/10 text-green-300';
                    else if (i === qs.selected) cls += 'border-red-500 bg-red-500/10 text-red-300';
                    else cls += 'border-slate-700 text-slate-500';
                    return <button key={i} className={cls} onClick={() => {
                        if (qs.answered) return;
                        setQs(s => ({ ...s, selected: i, answered: true, score: i === q.correct ? s.score + 1 : s.score }));
                    }}>{opt}</button>;
                })}
            </div>
            {qs.answered && <div className="text-xs text-slate-400 bg-slate-700/40 rounded-lg p-3">{q.explanation}</div>}
            {qs.answered && (
                <button onClick={() => {
                    if (qs.current + 1 >= QS.length) setQs(s => ({ ...s, complete: true }));
                    else setQs(s => ({ ...s, current: s.current + 1, selected: null, answered: false }));
                }} className="w-full text-xs bg-purple-600 hover:bg-purple-500 text-white py-2 rounded-lg transition-colors">
                    {qs.current + 1 >= QS.length ? 'See Results' : 'Next'}
                </button>
            )}
        </div>
    );
}

// ─── Presets ──────────────────────────────────────────────────────────────────

const PRESETS = [
    { n: 10, ops: [[0,1],[2,3],[4,5],[6,7],[8,9],[0,2],[4,6],[0,4]] },
    { n: 8,  ops: [[0,7],[1,2],[3,4],[5,6],[1,3],[0,5]] },
    { n: 6,  ops: [[0,1],[2,3],[4,5],[0,2],[0,4]] },
];

function randomOps(n) {
    const ops = [];
    const used = new Set();
    for (let i = 0; i < Math.min(n - 1, 7); i++) {
        let p, q, key;
        do {
            p = Math.floor(Math.random() * n);
            q = Math.floor(Math.random() * n);
            key = `${Math.min(p,q)}-${Math.max(p,q)}`;
        } while (p === q || used.has(key));
        used.add(key);
        ops.push([p, q]);
    }
    return ops;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function QuickFindPage() {
    const [preset, setPreset] = useState(PRESETS[0]);
    const [steps, setSteps] = useState([]);
    const [cur, setCur] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [speed, setSpeed] = useState(700);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const rebuild = useCallback((p) => {
        setSteps(generateSteps(p.n, p.ops));
        setCur(0); setPlaying(false);
    }, []);
    useEffect(() => { rebuild(preset); }, [preset, rebuild]);

    useEffect(() => {
        if (!playing || steps.length === 0) return;
        if (cur >= steps.length - 1) { setPlaying(false); return; }
        const t = setTimeout(() => setCur(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [playing, cur, steps, speed]);

    const step = steps[cur] || {};
    const { id = [], scanIdx, updateIdx, activeP, activeQ } = step;

    // Compute unique component ids and assign colors
    const uniqueIds = [...new Set(id)].sort((a, b) => a - b);
    const compColor = {};
    uniqueIds.forEach((v, i) => { compColor[v] = i % COMP_COLORS.length; });

    function cellCls(i) {
        if (updateIdx === i) return 'bg-green-500 border-green-400 text-white scale-110';
        if (scanIdx === i) return 'bg-yellow-400 border-yellow-300 text-slate-900 scale-110';
        if (activeP === i || activeQ === i) return 'ring-2 ring-offset-1 ring-offset-slate-900 ring-purple-400 ' + COMP_COLORS[compColor[id[i]]];
        return COMP_COLORS[compColor[id[i]]];
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="bg-gradient-to-r from-purple-600 to-violet-700 py-10 px-4">
                <div className="max-w-5xl mx-auto">
                    <p className="text-purple-200 text-sm font-semibold uppercase tracking-widest mb-1">Union-Find</p>
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">Quick Find</h1>
                    <p className="text-purple-100 max-w-2xl">Each element stores a flat component ID. find() is O(1); union() must relabel the entire array — O(n) per call.</p>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
                {/* Controls */}
                <div className="bg-slate-900/70 rounded-2xl border border-slate-700/50 p-5 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setCur(0)} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"><RotateCcw className="h-4 w-4" /></button>
                        <button onClick={() => setCur(s => Math.max(0, s - 1))} disabled={cur === 0} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 transition-colors"><SkipBack className="h-4 w-4" /></button>
                        <button onClick={() => setPlaying(p => !p)} className="p-2 rounded-lg bg-purple-600 hover:bg-purple-500 transition-colors">
                            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </button>
                        <button onClick={() => setCur(s => Math.min(steps.length - 1, s + 1))} disabled={cur >= steps.length - 1} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 transition-colors"><SkipForward className="h-4 w-4" /></button>
                        <button onClick={() => { const n = 6 + Math.floor(Math.random() * 5); setPreset({ n, ops: randomOps(n) }); }} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"><Shuffle className="h-4 w-4" /></button>
                    </div>
                    <div className="flex items-center gap-3 flex-1 min-w-[180px]">
                        <span className="text-xs text-slate-400">Speed</span>
                        <input type="range" min="150" max="1800" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="flex-1 accent-purple-500" />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {PRESETS.map((p, i) => (
                            <button key={i} onClick={() => setPreset(p)}
                                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${preset === p ? 'border-purple-500 bg-purple-500/20 text-purple-300' : 'border-slate-600 text-slate-400 hover:border-slate-500'}`}>
                                n={p.n}, {p.ops.length} ops
                            </button>
                        ))}
                    </div>
                    <span className="text-xs text-slate-500 ml-auto">Step {cur + 1}/{steps.length}</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-5">
                        {/* id[] array */}
                        <div className="bg-slate-900/70 rounded-2xl border border-slate-700/50 p-5">
                            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">id[ ] array — component label per element</h2>
                            <div className="flex gap-2 flex-wrap">
                                {id.map((v, i) => (
                                    <div key={i} className="flex flex-col items-center gap-1">
                                        <div className={`w-11 h-11 flex items-center justify-center rounded-xl border-2 text-sm font-bold transition-all duration-300 ${cellCls(i)}`}>
                                            {v}
                                        </div>
                                        <span className="text-[9px] text-slate-500 font-mono">id[{i}]</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Component groups */}
                        <div className="bg-slate-900/70 rounded-2xl border border-slate-700/50 p-5">
                            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Connected Components</h2>
                            <div className="flex flex-wrap gap-3">
                                {uniqueIds.map(cid => {
                                    const members = id.map((v, i) => v === cid ? i : -1).filter(x => x >= 0);
                                    const cls = COMP_COLORS[compColor[cid]];
                                    return (
                                        <div key={cid} className="flex items-center gap-2 bg-slate-800/60 rounded-xl px-3 py-2 border border-slate-700/50">
                                            <span className="text-xs text-slate-500">C{cid}:</span>
                                            <div className="flex gap-1">
                                                {members.map(m => (
                                                    <div key={m} className={`w-7 h-7 flex items-center justify-center rounded-lg border text-xs font-bold transition-all duration-300 ${cls}`}>
                                                        {m}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Operation log */}
                        <div className="bg-slate-900/70 rounded-2xl border border-slate-700/50 p-5">
                            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Operations Queue</h2>
                            <div className="flex flex-wrap gap-2">
                                {preset.ops.map(([p, q], i) => (
                                    <span key={i} className="text-xs font-mono px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400">
                                        union({p},{q})
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                            <div className="flex items-start gap-2">
                                <Info className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                                <p className="text-purple-300 text-sm leading-relaxed">{step.explanation || '…'}</p>
                            </div>
                        </div>

                        <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Complexity</p>
                            <div className="space-y-2 text-xs">
                                {[['find(x)', 'O(1)', 'text-green-400'], ['union(p,q)', 'O(n)', 'text-red-400'], ['Space', 'O(n)', 'text-slate-300']].map(([op, c, col]) => (
                                    <div key={op} className="flex justify-between">
                                        <span className="text-slate-400 font-mono">{op}</span>
                                        <span className={`font-mono font-semibold ${col}`}>{c}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-700 space-y-1 text-xs">
                                <div className="flex justify-between"><span className="text-slate-400">n</span><span className="text-slate-300">{preset.n}</span></div>
                                <div className="flex justify-between"><span className="text-slate-400">Components</span><span className="text-purple-300 font-semibold">{uniqueIds.length}</span></div>
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Legend</p>
                            <div className="space-y-2 text-xs text-slate-400">
                                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-yellow-400 border border-yellow-300" />Scanning</div>
                                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-green-500 border border-green-400" />Just updated</div>
                                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded border-2 border-purple-400 bg-purple-500" />Active p or q</div>
                            </div>
                        </div>

                        <QuizPanel qs={quizState} setQs={setQuizState} />
                    </div>
                </div>
            </div>
        </div>
    );
}
