"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Info, Clock, Code2, CheckCircle, XCircle, AlignLeft } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "When two characters match in the LCS DP table, what is dp[i][j]?",
        options: ["max(dp[i-1][j], dp[i][j-1])", "dp[i-1][j-1] + 1", "dp[i][j-1] + 1", "dp[i-1][j] + dp[i][j-1]"],
        correct: 1,
        explanation: "When str1[i-1] == str2[j-1] we can extend the LCS found for the prefixes without those characters: dp[i][j] = dp[i-1][j-1] + 1."
    },
    {
        question: "What does 'subsequence' mean (compared to 'substring')?",
        options: ["Consecutive characters only", "Characters maintain relative order but need not be consecutive", "Any rearrangement of characters", "Characters at the same positions"],
        correct: 1,
        explanation: "A subsequence preserves the original order of characters but allows gaps — unlike a substring which requires consecutiveness."
    },
    {
        question: "Which real-world tool relies heavily on LCS?",
        options: ["Hash tables", "Git diff / version control", "Binary search", "Graph shortest path"],
        correct: 1,
        explanation: "Git's diff algorithm uses LCS to identify which lines were added, removed, or unchanged between two file versions."
    }
];

const LCSPage = () => {
    const [string1, setString1] = useState("ABCDGH");
    const [string2, setString2] = useState("AEDFHR");
    const [originalString1] = useState("ABCDGH");
    const [originalString2] = useState("AEDFHR");
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(800);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const generateLCSSteps = (s1, s2) => {
        const steps = [];
        const m = s1.length, n = s2.length;
        const dp = Array(m + 1).fill().map(() => Array(n + 1).fill(0));

        steps.push({
            dp: dp.map(r => [...r]), currentRow: -1, currentCol: -1, char1: '', char2: '',
            decision: '', explanation: `Initialize LCS table for "${s1}" and "${s2}". First row and column are 0 (empty-string base cases).`,
            phase: 'initialize', lcs: '', lcsPath: []
        });

        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                const c1 = s1[i - 1], c2 = s2[j - 1];
                steps.push({
                    dp: dp.map(r => [...r]), currentRow: i, currentCol: j, char1: c1, char2: c2,
                    decision: '', explanation: `Comparing "${c1}" (s1[${i - 1}]) with "${c2}" (s2[${j - 1}]) at cell [${i}][${j}].`,
                    phase: 'comparing', lcs: '', lcsPath: []
                });

                if (c1 === c2) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                    steps.push({
                        dp: dp.map(r => [...r]), currentRow: i, currentCol: j, char1: c1, char2: c2,
                        decision: 'match',
                        explanation: `Match! "${c1}" = "${c2}". dp[${i}][${j}] = dp[${i - 1}][${j - 1}] + 1 = ${dp[i - 1][j - 1]} + 1 = ${dp[i][j]}.`,
                        phase: 'match', lcs: '', lcsPath: []
                    });
                } else {
                    const fl = dp[i][j - 1], ft = dp[i - 1][j];
                    dp[i][j] = Math.max(fl, ft);
                    steps.push({
                        dp: dp.map(r => [...r]), currentRow: i, currentCol: j, char1: c1, char2: c2,
                        decision: 'no_match',
                        explanation: `No match: "${c1}" ≠ "${c2}". dp[${i}][${j}] = max(dp[${i}][${j - 1}], dp[${i - 1}][${j}]) = max(${fl}, ${ft}) = ${dp[i][j]}.`,
                        phase: 'no_match', lcs: '', lcsPath: []
                    });
                }
            }
        }

        steps.push({
            dp: dp.map(r => [...r]), currentRow: m, currentCol: n, char1: '', char2: '',
            decision: '', explanation: `Table filled. LCS length = dp[${m}][${n}] = ${dp[m][n]}. Backtracking to reconstruct the sequence.`,
            phase: 'backtrack_start', lcs: '', lcsPath: []
        });

        let i = m, j = n;
        const lcsChars = [], path = [];
        while (i > 0 && j > 0) {
            path.push([i, j]);
            if (s1[i - 1] === s2[j - 1]) {
                lcsChars.unshift(s1[i - 1]);
                steps.push({
                    dp: dp.map(r => [...r]), currentRow: i, currentCol: j, char1: s1[i - 1], char2: s2[j - 1],
                    decision: 'match',
                    explanation: `Backtrack: "${s1[i - 1]}" matches at [${i}][${j}]. Add to LCS, move diagonally to [${i - 1}][${j - 1}].`,
                    phase: 'backtracking', lcs: lcsChars.join(''), lcsPath: [...path]
                });
                i--; j--;
            } else if (dp[i - 1][j] > dp[i][j - 1]) {
                steps.push({
                    dp: dp.map(r => [...r]), currentRow: i, currentCol: j, char1: s1[i - 1], char2: s2[j - 1],
                    decision: 'move_up',
                    explanation: `Backtrack: no match. dp[${i - 1}][${j}]=${dp[i - 1][j]} > dp[${i}][${j - 1}]=${dp[i][j - 1]}. Move up.`,
                    phase: 'backtracking', lcs: lcsChars.join(''), lcsPath: [...path]
                });
                i--;
            } else {
                steps.push({
                    dp: dp.map(r => [...r]), currentRow: i, currentCol: j, char1: s1[i - 1], char2: s2[j - 1],
                    decision: 'move_left',
                    explanation: `Backtrack: no match. dp[${i}][${j - 1}]=${dp[i][j - 1]} >= dp[${i - 1}][${j}]=${dp[i - 1][j]}. Move left.`,
                    phase: 'backtracking', lcs: lcsChars.join(''), lcsPath: [...path]
                });
                j--;
            }
        }

        const finalLCS = lcsChars.join('');
        steps.push({
            dp: dp.map(r => [...r]), currentRow: -1, currentCol: -1, char1: '', char2: '',
            decision: '', explanation: `LCS complete! Longest Common Subsequence of "${s1}" and "${s2}" is "${finalLCS}" (length ${finalLCS.length}).`,
            phase: 'complete', lcs: finalLCS, lcsPath: path
        });

        return steps;
    };

    useEffect(() => {
        setStepHistory(generateLCSSteps(string1, string2));
        setCurrentStep(0);
    }, [string1, string2]);

    useEffect(() => {
        if (isPlaying && currentStep < stepHistory.length - 1) {
            const t = setTimeout(() => setCurrentStep(p => p + 1), speed);
            return () => clearTimeout(t);
        } else if (currentStep >= stepHistory.length - 1) setIsPlaying(false);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const reset = () => { setIsPlaying(false); setCurrentStep(0); };

    const randomStrings = () => {
        const chars = 'ABCDEFGHIJKLMNOP';
        const rand = (len) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        setString1(rand(Math.floor(Math.random() * 4) + 4));
        setString2(rand(Math.floor(Math.random() * 4) + 4));
        setIsPlaying(false); setCurrentStep(0);
    };

    const presets = {
        dna: { s1: "AGGTAB", s2: "GXTXAYB" },
        words: { s1: "HELLO", s2: "HELO" },
        simple: { s1: "ABC", s2: "AC" }
    };

    const currentState = stepHistory[currentStep] || {
        dp: [], currentRow: -1, currentCol: -1, char1: '', char2: '',
        decision: '', explanation: 'Click Play to begin', phase: 'start', lcs: '', lcsPath: []
    };

    const getCellColor = (i, j, val) => {
        const isCurrent = i === currentState.currentRow && j === currentState.currentCol;
        const isPath = currentState.lcsPath.some(([pi, pj]) => pi === i && pj === j);
        if (isCurrent) {
            if (currentState.decision === 'match') return 'bg-green-600 text-white border-green-500 transform scale-110';
            if (currentState.phase === 'backtracking') return 'bg-purple-600 text-white border-purple-500 transform scale-110';
            return 'bg-rose-500 text-white border-rose-400 transform scale-110';
        }
        if (isPath) return 'bg-purple-700 text-purple-100 border-purple-600';
        if (i === 0 || j === 0) return 'bg-slate-700 text-slate-400 border-slate-600';
        if (val === 0) return 'bg-slate-800 text-slate-500 border-slate-700';
        const tiers = ['bg-rose-900 text-rose-300 border-rose-800', 'bg-rose-700 text-rose-100 border-rose-600', 'bg-rose-500 text-white border-rose-400'];
        return tiers[Math.min(val - 1, 2)];
    };

    const getCharColor = (char, isStr1) => {
        const cur = isStr1 ? currentState.char1 : currentState.char2;
        if (char === cur && ['comparing', 'match', 'no_match'].includes(currentState.phase)) return 'bg-rose-500 text-white transform scale-110';
        if (currentState.lcs && currentState.lcs.includes(char)) return 'bg-green-600 text-white';
        return 'bg-slate-700 text-slate-200';
    };

    const handleAnswer = (i) => {
        if (quizState.answered) return;
        setQuizState(p => ({ ...p, selected: i, answered: true, score: i === quizQuestions[p.current].correct ? p.score + 1 : p.score }));
    };
    const nextQ = () => {
        if (quizState.current < quizQuestions.length - 1) setQuizState(p => ({ ...p, current: p.current + 1, selected: null, answered: false }));
        else setQuizState(p => ({ ...p, complete: true }));
    };

    const codeExample = `def lcs(str1, str2):
    m, n = len(str1), len(str2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if str1[i-1] == str2[j-1]:
                dp[i][j] = dp[i-1][j-1] + 1
            else:
                dp[i][j] = max(dp[i-1][j], dp[i][j-1])

    # Backtrack to find the actual LCS string
    result, i, j = [], m, n
    while i > 0 and j > 0:
        if str1[i-1] == str2[j-1]:
            result.append(str1[i-1])
            i -= 1; j -= 1
        elif dp[i-1][j] > dp[i][j-1]:
            i -= 1
        else:
            j -= 1

    return dp[m][n], ''.join(reversed(result))`;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-rose-600 to-pink-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex items-center mb-6">
                        <Link href="/dynamic-programming" className="flex items-center text-white hover:text-rose-200 transition-colors mr-4">
                            <ArrowLeft className="h-5 w-5 mr-2" />Back to Dynamic Programming
                        </Link>
                    </div>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4 flex items-center justify-center gap-3">
                            <AlignLeft className="h-10 w-10" />Longest Common Subsequence
                        </h1>
                        <p className="text-xl text-rose-100 mb-6 max-w-3xl mx-auto">
                            Watch 2D DP fill a table cell by cell to find the longest subsequence common to both strings, then backtrack to reconstruct it.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Time: O(m × n)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(m × n)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">2D DP Table</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Backtracking</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6 mb-6">
                            <div className="flex flex-wrap gap-3 mb-6">
                                <button onClick={() => isPlaying ? setIsPlaying(false) : setIsPlaying(true)} className="flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors font-medium" disabled={currentStep >= stepHistory.length - 1 && !isPlaying}>
                                    {isPlaying ? <Pause size={18} /> : <Play size={18} />}{isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={() => { if (currentStep > 0) setCurrentStep(p => p - 1); }} className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium" disabled={isPlaying || currentStep === 0}><SkipBack size={18} />Step Back</button>
                                <button onClick={() => { if (currentStep < stepHistory.length - 1) setCurrentStep(p => p + 1); }} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium" disabled={isPlaying || currentStep >= stepHistory.length - 1}><SkipForward size={18} />Step Forward</button>
                                <button onClick={reset} className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium"><RotateCcw size={18} />Reset</button>
                                <button onClick={randomStrings} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium">Random</button>
                                <button onClick={() => { setString1(originalString1); setString2(originalString2); setIsPlaying(false); setCurrentStep(0); }} className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium">Original</button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-slate-300">String 1</label>
                                    <input type="text" value={string1} onChange={e => setString1(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 10))}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 text-sm font-mono" placeholder="ABCDGH" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-slate-300">String 2</label>
                                    <input type="text" value={string2} onChange={e => setString2(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 10))}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 text-sm font-mono" placeholder="AEDFHR" />
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-6">
                                {Object.entries(presets).map(([key, val]) => (
                                    <button key={key} onClick={() => { setString1(val.s1); setString2(val.s2); setIsPlaying(false); setCurrentStep(0); }}
                                        className="px-3 py-1 bg-slate-700 text-slate-300 rounded text-sm hover:bg-slate-600 hover:text-white transition-colors capitalize">{key}</button>
                                ))}
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2 text-slate-300">Speed: {speed}ms</label>
                                <input type="range" min="300" max="2000" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-full max-w-md accent-rose-500" />
                                <div className="flex justify-between text-xs text-slate-500 max-w-md mt-1"><span>Fast (300ms)</span><span>Slow (2000ms)</span></div>
                            </div>

                            <div className="mb-6">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-slate-300">Step {currentStep + 1} of {stepHistory.length}</span>
                                    <span className="text-sm text-slate-500">Phase: {currentState.phase}</span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-2">
                                    <div className="bg-rose-500 h-2 rounded-full transition-all duration-300" style={{ width: `${((currentStep + 1) / stepHistory.length) * 100}%` }} />
                                </div>
                            </div>

                            {/* String display */}
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-slate-300 mb-3">Strings</h3>
                                <div className="space-y-3 p-4 bg-slate-800/60 rounded-lg border border-slate-700/60">
                                    {[{ label: 'String 1', str: string1, isStr1: true }, { label: 'String 2', str: string2, isStr1: false }].map(({ label, str, isStr1 }) => (
                                        <div key={label} className="flex items-center gap-3">
                                            <span className="text-sm font-medium text-slate-400 w-16">{label}:</span>
                                            <div className="flex gap-1">
                                                {str.split('').map((ch, idx) => (
                                                    <div key={idx} className={`w-8 h-8 rounded flex items-center justify-center font-bold text-sm border-2 border-transparent transition-all duration-300 ${getCharColor(ch, isStr1)}`}>{ch}</div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    {currentState.lcs && (
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-medium text-slate-400 w-16">LCS:</span>
                                            <div className="flex gap-1">
                                                {currentState.lcs.split('').map((ch, i) => (
                                                    <div key={i} className="w-8 h-8 rounded flex items-center justify-center font-bold text-sm border-2 bg-green-600 text-white border-green-500">{ch}</div>
                                                ))}
                                            </div>
                                            <span className="text-green-400 text-sm font-medium">Length: {currentState.lcs.length}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* DP Table */}
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-slate-300 mb-3">DP Table</h3>
                                <div className="overflow-auto p-4 bg-slate-800/60 rounded-lg border border-slate-700/60">
                                    {currentState.dp.length > 0 && (
                                        <table className="border-collapse">
                                            <thead>
                                                <tr>
                                                    <th className="w-8 h-8 text-xs bg-slate-800 border border-slate-600"></th>
                                                    <th className="w-8 h-8 text-xs bg-slate-800 border border-slate-600 text-slate-400">ε</th>
                                                    {string2.split('').map((c, i) => <th key={i} className="w-8 h-8 text-xs bg-slate-800 border border-slate-600 text-slate-300 font-bold">{c}</th>)}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {currentState.dp.map((row, i) => (
                                                    <tr key={i}>
                                                        <th className="w-8 h-8 text-xs bg-slate-800 border border-slate-600 text-slate-300 font-bold">{i === 0 ? 'ε' : string1[i - 1]}</th>
                                                        {row.map((val, j) => (
                                                            <td key={j} className={`w-8 h-8 text-center border border-slate-700 text-xs font-bold transition-all duration-300 ${getCellColor(i, j, val)}`}>{val}</td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-400">
                                    {[['bg-rose-500', 'Current cell'], ['bg-green-600', 'Match'], ['bg-purple-700', 'Backtrack path']].map(([color, label]) => (
                                        <div key={label} className="flex items-center gap-1.5"><div className={`w-4 h-4 rounded ${color}`} /><span>{label}</span></div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <Info className="h-5 w-5 text-rose-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h3 className="font-semibold text-rose-300 mb-1">Current Step</h3>
                                        <p className="text-rose-200 text-sm leading-relaxed">{currentState.explanation}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <div className="flex items-center gap-2 mb-4"><Clock className="h-5 w-5 text-rose-500" /><h3 className="font-bold text-white">Algorithm Details</h3></div>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between"><span className="text-slate-300">Time:</span><code className="bg-yellow-500/15 text-yellow-400 px-2 py-1 rounded">O(m × n)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Space:</span><code className="bg-blue-500/15 text-blue-400 px-2 py-1 rounded">O(m × n)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Space-optimized:</span><code className="bg-green-500/15 text-green-400 px-2 py-1 rounded">O(min(m,n))</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Type:</span><span className="bg-rose-500/15 text-rose-400 px-2 py-1 rounded">2D DP</span></div>
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">Key Concepts</h3>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Match:</strong> dp[i][j] = dp[i-1][j-1] + 1</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">No match:</strong> dp[i][j] = max(dp[i-1][j], dp[i][j-1])</span></li>
                                <li className="flex items-start gap-2"><Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Base case:</strong> row 0 and col 0 = 0</span></li>
                                <li className="flex items-start gap-2"><Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Answer:</strong> dp[m][n]</span></li>
                            </ul>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">Knowledge Check</h3>
                            {quizState.complete ? (
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-white mb-2">{quizState.score}/{quizQuestions.length}</p>
                                    <p className="text-slate-400 mb-4">{quizState.score === quizQuestions.length ? 'Perfect!' : 'Keep practicing!'}</p>
                                    <button onClick={() => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false })} className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 text-sm font-medium">Try Again</button>
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
};

export default LCSPage;
