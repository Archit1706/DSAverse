"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Info, Clock, Code2, CheckCircle, Edit3, Shuffle } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "When two characters match in the Edit Distance table, what is dp[i][j]?",
        options: ["dp[i-1][j-1]", "dp[i-1][j-1] + 1", "min(dp[i-1][j], dp[i][j-1])", "0"],
        correct: 0,
        explanation: "When characters match, no edit is needed — we carry forward dp[i-1][j-1], the cost for the prefixes without those characters."
    },
    {
        question: "Which three operations does Levenshtein distance use?",
        options: ["Insert, Delete, Swap", "Insert, Delete, Substitute", "Copy, Move, Replace", "Add, Remove, Transpose"],
        correct: 1,
        explanation: "Levenshtein distance uses Insert (add a character), Delete (remove a character), and Substitute (replace one character with another)."
    },
    {
        question: "What is the edit distance between 'KITTEN' and 'SITTING'?",
        options: ["2", "3", "4", "5"],
        correct: 1,
        explanation: "KITTEN → SITTEN (sub K→S) → SITTIN (sub E→I) → SITTING (insert G) = 3 operations."
    }
];

const generateSteps = (s1, s2) => {
    const steps = [];
    const m = s1.length, n = s2.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    steps.push({
        dp: dp.map(r => [...r]),
        currentRow: -1, currentCol: -1, operation: 'init',
        explanation: `Initialize: row 0 = cost of deleting chars from "${s1}" (0,1,…${m}); column 0 = cost of inserting chars from "${s2}" (0,1,…${n}).`,
        phase: 'initialize', backtrackPath: []
    });

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const c1 = s1[i - 1], c2 = s2[j - 1];
            steps.push({
                dp: dp.map(r => [...r]),
                currentRow: i, currentCol: j, operation: 'comparing',
                explanation: `Comparing "${c1}" (source[${i - 1}]) with "${c2}" (target[${j - 1}]).`,
                phase: 'comparing', backtrackPath: []
            });

            if (c1 === c2) {
                dp[i][j] = dp[i - 1][j - 1];
                steps.push({
                    dp: dp.map(r => [...r]),
                    currentRow: i, currentCol: j, operation: 'match',
                    explanation: `Match! "${c1}" = "${c2}". No edit needed. dp[${i}][${j}] = dp[${i - 1}][${j - 1}] = ${dp[i][j]}.`,
                    phase: 'match', backtrackPath: []
                });
            } else {
                const ins = dp[i][j - 1] + 1;
                const del = dp[i - 1][j] + 1;
                const sub = dp[i - 1][j - 1] + 1;
                dp[i][j] = Math.min(ins, del, sub);
                const op = dp[i][j] === sub ? 'substitute' : dp[i][j] === del ? 'delete' : 'insert';
                steps.push({
                    dp: dp.map(r => [...r]),
                    currentRow: i, currentCol: j, operation: op,
                    explanation: `No match: "${c1}" ≠ "${c2}". Insert=${ins}, Delete=${del}, Substitute=${sub} → best: ${op} (cost ${dp[i][j]}).`,
                    phase: 'no_match', backtrackPath: []
                });
            }
        }
    }

    steps.push({
        dp: dp.map(r => [...r]),
        currentRow: m, currentCol: n, operation: '',
        explanation: `Table complete. Edit distance = dp[${m}][${n}] = ${dp[m][n]}. Backtracking to reconstruct the edit sequence…`,
        phase: 'backtrack_start', backtrackPath: []
    });

    let i = m, j = n;
    const path = [];
    while (i > 0 || j > 0) {
        path.push([i, j]);
        if (i > 0 && j > 0 && s1[i - 1] === s2[j - 1]) {
            steps.push({
                dp: dp.map(r => [...r]), currentRow: i, currentCol: j, operation: 'match',
                explanation: `"${s1[i - 1]}" = "${s2[j - 1]}" — no edit, move diagonally to [${i - 1}][${j - 1}].`,
                phase: 'backtracking', backtrackPath: [...path]
            });
            i--; j--;
        } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
            steps.push({
                dp: dp.map(r => [...r]), currentRow: i, currentCol: j, operation: 'substitute',
                explanation: `Substitute "${s1[i - 1]}" → "${s2[j - 1]}". Move diagonally to [${i - 1}][${j - 1}].`,
                phase: 'backtracking', backtrackPath: [...path]
            });
            i--; j--;
        } else if (j > 0 && (i === 0 || dp[i][j] === dp[i][j - 1] + 1)) {
            steps.push({
                dp: dp.map(r => [...r]), currentRow: i, currentCol: j, operation: 'insert',
                explanation: `Insert "${s2[j - 1]}". Move left to [${i}][${j - 1}].`,
                phase: 'backtracking', backtrackPath: [...path]
            });
            j--;
        } else {
            steps.push({
                dp: dp.map(r => [...r]), currentRow: i, currentCol: j, operation: 'delete',
                explanation: `Delete "${s1[i - 1]}". Move up to [${i - 1}][${j}].`,
                phase: 'backtracking', backtrackPath: [...path]
            });
            i--;
        }
    }

    steps.push({
        dp: dp.map(r => [...r]),
        currentRow: -1, currentCol: -1, operation: '',
        explanation: `Done! Edit distance between "${s1}" and "${s2}" is ${dp[m][n]}.`,
        phase: 'complete', backtrackPath: path
    });

    return steps;
};

const PRESETS = {
    classic: { s1: 'KITTEN', s2: 'SITTING' },
    similar: { s1: 'SUNDAY', s2: 'SATURDAY' },
    dna: { s1: 'ATCGT', s2: 'ACGT' },
    short: { s1: 'CAT', s2: 'CUT' },
};

const WORDS = ['APPLE', 'CLOUD', 'BRAIN', 'DELTA', 'FLAME', 'GRIND', 'HOVER', 'INDEX', 'JOINT', 'KNEEL'];

const codeExample = `def edit_distance(s1, s2):
    m, n = len(s1), len(s2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]

    # Base cases
    for i in range(m + 1): dp[i][0] = i
    for j in range(n + 1): dp[0][j] = j

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if s1[i-1] == s2[j-1]:
                dp[i][j] = dp[i-1][j-1]        # match — no cost
            else:
                dp[i][j] = 1 + min(
                    dp[i][j-1],     # insert
                    dp[i-1][j],     # delete
                    dp[i-1][j-1]    # substitute
                )
    return dp[m][n]`;

export default function EditDistancePage() {
    const [source, setSource] = useState('KITTEN');
    const [target, setTarget] = useState('SITTING');
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(700);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const rebuild = useCallback(() => {
        setStepHistory(generateSteps(source, target));
        setCurrentStep(0);
        setIsPlaying(false);
    }, [source, target]);

    useEffect(() => { rebuild(); }, [rebuild]);

    useEffect(() => {
        if (!isPlaying || stepHistory.length === 0) return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const shuffle = () => {
        const s1 = WORDS[Math.floor(Math.random() * WORDS.length)];
        let s2 = WORDS[Math.floor(Math.random() * WORDS.length)];
        while (s2 === s1) s2 = WORDS[Math.floor(Math.random() * WORDS.length)];
        setSource(s1); setTarget(s2);
    };

    const cur = stepHistory[currentStep] || {
        dp: [], currentRow: -1, currentCol: -1, operation: '', phase: 'start', backtrackPath: []
    };

    const getCellColor = (i, j, val) => {
        const isCur = i === cur.currentRow && j === cur.currentCol;
        const isPath = cur.backtrackPath.some(([pi, pj]) => pi === i && pj === j);

        if (isCur) {
            if (cur.operation === 'match') return 'bg-green-600 text-white border-green-500 scale-110';
            if (cur.operation === 'substitute') return 'bg-amber-500 text-white border-amber-400 scale-110';
            if (cur.operation === 'insert') return 'bg-blue-500 text-white border-blue-400 scale-110';
            if (cur.operation === 'delete') return 'bg-red-500 text-white border-red-400 scale-110';
            return 'bg-rose-500 text-white border-rose-400 scale-110';
        }
        if (isPath) {
            if (cur.phase === 'complete') return 'bg-purple-700 text-purple-100 border-purple-600';
            return 'bg-purple-800 text-purple-200 border-purple-700';
        }
        if (i === 0 || j === 0) return 'bg-slate-700 text-slate-300 border-slate-600';
        if (val === 0) return 'bg-slate-800 text-slate-500 border-slate-700';
        const maxVal = Math.max(source.length, target.length);
        const intensity = val / maxVal;
        if (intensity < 0.3) return 'bg-rose-900 text-rose-300 border-rose-800';
        if (intensity < 0.6) return 'bg-rose-700 text-rose-100 border-rose-600';
        return 'bg-rose-500 text-white border-rose-400';
    };

    const getOpColor = (op) => {
        if (op === 'match') return 'text-green-400';
        if (op === 'substitute') return 'text-amber-400';
        if (op === 'insert') return 'text-blue-400';
        if (op === 'delete') return 'text-red-400';
        return 'text-rose-400';
    };

    const handleAnswer = (i) => {
        if (quizState.answered) return;
        setQuizState(p => ({ ...p, selected: i, answered: true, score: i === quizQuestions[p.current].correct ? p.score + 1 : p.score }));
    };
    const nextQ = () => {
        if (quizState.current < quizQuestions.length - 1)
            setQuizState(p => ({ ...p, current: p.current + 1, selected: null, answered: false }));
        else setQuizState(p => ({ ...p, complete: true }));
    };

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-rose-600 to-pink-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex items-center mb-6">
                        <Link href="/dynamic-programming" className="flex items-center text-white hover:text-rose-200 transition-colors">
                            <ArrowLeft className="h-5 w-5 mr-2" />Back to Dynamic Programming
                        </Link>
                    </div>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4 flex items-center justify-center gap-3">
                            <Edit3 className="h-10 w-10" />Edit Distance
                        </h1>
                        <p className="text-xl text-rose-100 mb-6 max-w-3xl mx-auto">
                            Minimum insertions, deletions, and substitutions to transform one string into another.
                            Foundation of spell checkers, autocorrect, and DNA sequence alignment.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Time: O(m × n)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(m × n)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">2D DP Table</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Levenshtein Distance</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: visualization */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            {/* Controls */}
                            <div className="flex flex-wrap gap-3 mb-6">
                                <button onClick={() => setIsPlaying(p => !p)} disabled={currentStep >= stepHistory.length - 1 && !isPlaying}
                                    className="flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors font-medium">
                                    {isPlaying ? <Pause size={18} /> : <Play size={18} />}{isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={() => setCurrentStep(p => Math.max(0, p - 1))} disabled={isPlaying || currentStep === 0}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium">
                                    <SkipBack size={18} />Back
                                </button>
                                <button onClick={() => setCurrentStep(p => Math.min(stepHistory.length - 1, p + 1))} disabled={isPlaying || currentStep >= stepHistory.length - 1}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium">
                                    <SkipForward size={18} />Forward
                                </button>
                                <button onClick={rebuild} className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium">
                                    <RotateCcw size={18} />Reset
                                </button>
                                <button onClick={shuffle} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium">
                                    <Shuffle size={18} />Random
                                </button>
                            </div>

                            {/* String inputs */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-slate-300">Source string</label>
                                    <input type="text" value={source}
                                        onChange={e => setSource(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 10))}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 text-sm font-mono" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-slate-300">Target string</label>
                                    <input type="text" value={target}
                                        onChange={e => setTarget(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 10))}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 text-sm font-mono" />
                                </div>
                            </div>

                            {/* Presets */}
                            <div className="flex flex-wrap gap-2 mb-6">
                                {Object.entries(PRESETS).map(([key, val]) => (
                                    <button key={key} onClick={() => { setSource(val.s1); setTarget(val.s2); }}
                                        className="px-3 py-1 bg-slate-700 text-slate-300 rounded text-sm hover:bg-slate-600 hover:text-white transition-colors capitalize">
                                        {key}
                                    </button>
                                ))}
                            </div>

                            {/* Speed */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2 text-slate-300">Speed: {speed}ms</label>
                                <input type="range" min="200" max="2000" value={speed} onChange={e => setSpeed(Number(e.target.value))}
                                    className="w-full max-w-md accent-rose-500" />
                                <div className="flex justify-between text-xs text-slate-500 max-w-md mt-1"><span>Fast</span><span>Slow</span></div>
                            </div>

                            {/* Progress */}
                            <div className="mb-6">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-slate-300">Step {currentStep + 1} / {stepHistory.length}</span>
                                    <span className={`text-sm font-medium ${getOpColor(cur.operation)}`}>{cur.phase}</span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-2">
                                    <div className="bg-rose-500 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${((currentStep + 1) / stepHistory.length) * 100}%` }} />
                                </div>
                            </div>

                            {/* String display */}
                            <div className="mb-6 p-4 bg-slate-800/60 rounded-lg border border-slate-700/60">
                                <h3 className="text-sm font-semibold text-slate-300 mb-3">Strings</h3>
                                {[{ label: 'Source', str: source }, { label: 'Target', str: target }].map(({ label, str }) => (
                                    <div key={label} className="flex items-center gap-3 mb-2">
                                        <span className="text-sm font-medium text-slate-400 w-14">{label}:</span>
                                        <div className="flex gap-1">
                                            {str.split('').map((ch, idx) => {
                                                const rowMatch = label === 'Source' && idx === cur.currentRow - 1;
                                                const colMatch = label === 'Target' && idx === cur.currentCol - 1;
                                                const active = rowMatch || colMatch;
                                                return (
                                                    <div key={idx} className={`w-8 h-8 rounded flex items-center justify-center font-bold text-sm border-2 border-transparent transition-all duration-300
                                                        ${active ? 'bg-rose-500 text-white scale-110' : 'bg-slate-700 text-slate-200'}`}>
                                                        {ch}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                                {cur.phase === 'complete' && (
                                    <div className="mt-3 pt-3 border-t border-slate-700">
                                        <p className="text-green-400 text-sm font-semibold">
                                            Edit distance: {cur.dp[source.length]?.[target.length] ?? '–'}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* DP Table */}
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-slate-300 mb-3">DP Table</h3>
                                <div className="overflow-auto p-4 bg-slate-800/60 rounded-lg border border-slate-700/60">
                                    {cur.dp.length > 0 && (
                                        <table className="border-collapse">
                                            <thead>
                                                <tr>
                                                    <th className="w-8 h-8 text-xs bg-slate-800 border border-slate-600" />
                                                    <th className="w-8 h-8 text-xs bg-slate-800 border border-slate-600 text-slate-400">ε</th>
                                                    {target.split('').map((c, i) => (
                                                        <th key={i} className="w-8 h-8 text-xs bg-slate-800 border border-slate-600 text-slate-300 font-bold">{c}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {cur.dp.map((row, i) => (
                                                    <tr key={i}>
                                                        <th className="w-8 h-8 text-xs bg-slate-800 border border-slate-600 text-slate-300 font-bold">
                                                            {i === 0 ? 'ε' : source[i - 1]}
                                                        </th>
                                                        {row.map((val, j) => (
                                                            <td key={j} className={`w-8 h-8 text-center border border-slate-700 text-xs font-bold transition-all duration-300 ${getCellColor(i, j, val)}`}>
                                                                {val}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-400">
                                    {[
                                        ['bg-green-600', 'Match'],
                                        ['bg-amber-500', 'Substitute'],
                                        ['bg-blue-500', 'Insert'],
                                        ['bg-red-500', 'Delete'],
                                        ['bg-purple-700', 'Backtrack path'],
                                    ].map(([color, label]) => (
                                        <div key={label} className="flex items-center gap-1.5">
                                            <div className={`w-4 h-4 rounded ${color}`} /><span>{label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Explanation */}
                            <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <Info className="h-5 w-5 text-rose-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-rose-200 text-sm leading-relaxed">{cur.explanation || 'Click Play to begin.'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right sidebar */}
                    <div className="space-y-6">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <div className="flex items-center gap-2 mb-4"><Clock className="h-5 w-5 text-rose-500" /><h3 className="font-bold text-white">Algorithm Details</h3></div>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between"><span className="text-slate-300">Time:</span><code className="bg-yellow-500/15 text-yellow-400 px-2 py-1 rounded">O(m × n)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Space:</span><code className="bg-blue-500/15 text-blue-400 px-2 py-1 rounded">O(m × n)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Space-optimized:</span><code className="bg-green-500/15 text-green-400 px-2 py-1 rounded">O(min(m,n))</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Type:</span><span className="bg-rose-500/15 text-rose-400 px-2 py-1 rounded text-xs">2D DP</span></div>
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">Recurrence</h3>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Match:</strong> dp[i][j] = dp[i-1][j-1]</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Substitute:</strong> dp[i-1][j-1] + 1</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Insert:</strong> dp[i][j-1] + 1</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Delete:</strong> dp[i-1][j] + 1</span></li>
                                <li className="flex items-start gap-2"><Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Answer:</strong> dp[m][n]</span></li>
                            </ul>
                        </div>

                        {/* Quiz */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">Knowledge Check</h3>
                            {quizState.complete ? (
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-white mb-2">{quizState.score}/{quizQuestions.length}</p>
                                    <p className="text-slate-400 mb-4">{quizState.score === quizQuestions.length ? 'Perfect!' : 'Keep practicing!'}</p>
                                    <button onClick={() => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false })}
                                        className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 text-sm font-medium">Try Again</button>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-xs text-slate-500 mb-2">Question {quizState.current + 1} of {quizQuestions.length}</p>
                                    <p className="text-sm font-medium text-slate-200 mb-3">{quizQuestions[quizState.current].question}</p>
                                    <div className="space-y-2">
                                        {quizQuestions[quizState.current].options.map((opt, i) => {
                                            let cls = 'w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors ';
                                            if (!quizState.answered) cls += 'border-slate-600 text-slate-300 hover:border-rose-500 hover:text-white bg-slate-800/50';
                                            else if (i === quizQuestions[quizState.current].correct) cls += 'border-green-500 bg-green-500/10 text-green-300';
                                            else if (i === quizState.selected) cls += 'border-red-500 bg-red-500/10 text-red-300';
                                            else cls += 'border-slate-700 text-slate-500 bg-slate-800/30';
                                            return <button key={i} onClick={() => handleAnswer(i)} className={cls}>{opt}</button>;
                                        })}
                                    </div>
                                    {quizState.answered && (
                                        <div className="mt-3">
                                            <p className="text-xs text-slate-400 mb-3">{quizQuestions[quizState.current].explanation}</p>
                                            <button onClick={nextQ} className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 text-sm font-medium">
                                                {quizState.current < quizQuestions.length - 1 ? 'Next Question' : 'See Results'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <button onClick={() => setShowCode(s => !s)} className="flex items-center gap-2 text-rose-400 hover:text-rose-300 font-medium">
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
