"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Info, Clock, Code2, CheckCircle, TrendingUp, Shuffle } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "What is the initial value of dp[i] in the LIS algorithm?",
        options: ["0", "1", "arr[i]", "∞"],
        correct: 1,
        explanation: "Every element is a valid LIS of length 1 by itself (just that element), so dp[i] starts at 1."
    },
    {
        question: "When do we update dp[i] using dp[j] (where j < i)?",
        options: ["Always", "When arr[j] > arr[i]", "When arr[j] < arr[i] and dp[j]+1 > dp[i]", "When arr[j] == arr[i]"],
        correct: 2,
        explanation: "We extend the LIS ending at j by appending arr[i] only when arr[j] < arr[i] (strictly increasing) and doing so gives a longer subsequence than what we have."
    },
    {
        question: "What is the time complexity of the O(n²) LIS DP approach?",
        options: ["O(n)", "O(n log n)", "O(n²)", "O(2ⁿ)"],
        correct: 2,
        explanation: "The nested loop (for each i, compare with all j < i) runs in O(n²). An O(n log n) solution exists using patience sorting with binary search."
    }
];

const generateSteps = (arr) => {
    const steps = [];
    const n = arr.length;
    const dp = Array(n).fill(1);
    const parent = Array(n).fill(-1);

    steps.push({
        arr: [...arr], dp: [...dp],
        currentI: -1, currentJ: -1,
        phase: 'initialize',
        explanation: `Initialize dp[i] = 1 for every index — each element alone forms a valid LIS of length 1.`,
        lisIndices: []
    });

    for (let i = 1; i < n; i++) {
        steps.push({
            arr: [...arr], dp: [...dp],
            currentI: i, currentJ: -1,
            phase: 'outer',
            explanation: `Processing arr[${i}] = ${arr[i]}. Scanning all previous elements to find ones smaller than ${arr[i]}.`,
            lisIndices: []
        });

        for (let j = 0; j < i; j++) {
            const canExtend = arr[j] < arr[i];
            const wouldImprove = canExtend && dp[j] + 1 > dp[i];
            steps.push({
                arr: [...arr], dp: [...dp],
                currentI: i, currentJ: j,
                phase: 'comparing',
                explanation: `arr[${j}]=${arr[j]} vs arr[${i}]=${arr[i]}: ${canExtend ? `${arr[j]} < ${arr[i]} ✓${wouldImprove ? ` and dp[${j}]+1=${dp[j]+1} > dp[${i}]=${dp[i]}, updating!` : ` but dp[${j}]+1=${dp[j]+1} ≤ dp[${i}]=${dp[i]}, no improvement.`}` : `${arr[j]} ≥ ${arr[i]}, cannot extend.`}`,
                lisIndices: []
            });

            if (wouldImprove) {
                dp[i] = dp[j] + 1;
                parent[i] = j;
                steps.push({
                    arr: [...arr], dp: [...dp],
                    currentI: i, currentJ: j,
                    phase: 'update',
                    explanation: `Updated dp[${i}] = ${dp[i]}. LIS ending at arr[${i}]=${arr[i]} can now be extended from arr[${j}]=${arr[j]}.`,
                    lisIndices: []
                });
            }
        }

        steps.push({
            arr: [...arr], dp: [...dp],
            currentI: i, currentJ: -1,
            phase: 'confirmed',
            explanation: `dp[${i}] = ${dp[i]} finalized. Longest increasing subsequence ending at ${arr[i]} has length ${dp[i]}.`,
            lisIndices: []
        });
    }

    const maxLen = Math.max(...dp);
    const maxIdx = dp.lastIndexOf(maxLen);

    steps.push({
        arr: [...arr], dp: [...dp],
        currentI: -1, currentJ: -1,
        phase: 'reconstruct',
        explanation: `Table complete. Maximum dp value = ${maxLen} at index ${maxIdx}. Reconstructing the actual LIS by following parent pointers…`,
        lisIndices: []
    });

    const lisIndices = [];
    let cur = maxIdx;
    while (cur !== -1) {
        lisIndices.unshift(cur);
        cur = parent[cur];
    }

    steps.push({
        arr: [...arr], dp: [...dp],
        currentI: -1, currentJ: -1,
        phase: 'complete',
        explanation: `Done! LIS length = ${maxLen}. One longest increasing subsequence: [${lisIndices.map(i => arr[i]).join(', ')}].`,
        lisIndices
    });

    return steps;
};

const PRESETS = {
    classic: [10, 9, 2, 5, 3, 7, 101, 18],
    ascending: [1, 3, 5, 7, 9, 2, 4, 6],
    descending: [9, 7, 5, 3, 1],
    random: [3, 10, 2, 1, 20, 4, 6, 8],
};

const codeExample = `def lis(arr):
    n = len(arr)
    dp = [1] * n
    parent = [-1] * n

    for i in range(1, n):
        for j in range(i):
            if arr[j] < arr[i] and dp[j] + 1 > dp[i]:
                dp[i] = dp[j] + 1
                parent[i] = j

    # Reconstruct LIS
    max_len = max(dp)
    idx = dp.index(max_len)
    result = []
    while idx != -1:
        result.append(arr[idx])
        idx = parent[idx]

    return max_len, list(reversed(result))

# O(n log n) with patience sorting:
import bisect
def lis_fast(arr):
    tails = []
    for x in arr:
        pos = bisect.bisect_left(tails, x)
        if pos == len(tails): tails.append(x)
        else: tails[pos] = x
    return len(tails)`;

export default function LISPage() {
    const [arr, setArr] = useState([10, 9, 2, 5, 3, 7, 101, 18]);
    const [inputText, setInputText] = useState('10, 9, 2, 5, 3, 7, 101, 18');
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(700);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const rebuild = useCallback((a) => {
        setStepHistory(generateSteps(a));
        setCurrentStep(0);
        setIsPlaying(false);
    }, []);

    useEffect(() => { rebuild(arr); }, []);

    useEffect(() => {
        if (!isPlaying || stepHistory.length === 0) return;
        if (currentStep >= stepHistory.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const applyInput = () => {
        const parsed = inputText.split(/[,\s]+/).map(Number).filter(n => !isNaN(n) && n > 0).slice(0, 12);
        if (parsed.length >= 2) { setArr(parsed); rebuild(parsed); }
    };

    const shuffle = () => {
        const newArr = Array.from({ length: 8 }, () => Math.floor(Math.random() * 50) + 1);
        setArr(newArr);
        setInputText(newArr.join(', '));
        rebuild(newArr);
    };

    const applyPreset = (key) => {
        const p = PRESETS[key];
        setArr(p);
        setInputText(p.join(', '));
        rebuild(p);
    };

    const cur = stepHistory[currentStep] || {
        arr: [], dp: [], currentI: -1, currentJ: -1, phase: 'start', explanation: 'Click Play to begin.', lisIndices: []
    };

    const getElementStyle = (idx) => {
        const isCurrentI = idx === cur.currentI;
        const isCurrentJ = idx === cur.currentJ;
        const isInLIS = cur.lisIndices.includes(idx);
        const dp = cur.dp[idx] ?? 1;

        if (cur.phase === 'complete' && isInLIS) return 'bg-green-500 border-green-400 text-white scale-110';
        if (isCurrentI && isCurrentJ) return 'bg-amber-400 border-amber-300 text-slate-900 scale-110';
        if (isCurrentI) return 'bg-rose-500 border-rose-400 text-white scale-110';
        if (isCurrentJ) return 'bg-blue-500 border-blue-400 text-white scale-110';
        return 'bg-slate-700 border-slate-600 text-slate-100';
    };

    const getDPStyle = (idx) => {
        const isCurrentI = idx === cur.currentI;
        const isInLIS = cur.lisIndices.includes(idx);
        if (cur.phase === 'complete' && isInLIS) return 'bg-green-700 border-green-600 text-green-200';
        if (isCurrentI) return 'bg-rose-700 border-rose-600 text-rose-200';
        return 'bg-slate-800 border-slate-700 text-slate-400';
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
                            <TrendingUp className="h-10 w-10" />Longest Increasing Subsequence
                        </h1>
                        <p className="text-xl text-rose-100 mb-6 max-w-3xl mx-auto">
                            Find the longest strictly increasing subsequence in an array using 1D DP.
                            Watch dp[i] values grow as the algorithm discovers longer chains.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Time: O(n²)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(n)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">1D DP Array</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Subsequence Problem</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left */}
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
                                <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }} className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium">
                                    <RotateCcw size={18} />Reset
                                </button>
                                <button onClick={shuffle} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium">
                                    <Shuffle size={18} />Random
                                </button>
                            </div>

                            {/* Input */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2 text-slate-300">Array (comma-separated, up to 12 numbers)</label>
                                <div className="flex gap-2">
                                    <input type="text" value={inputText} onChange={e => setInputText(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && applyInput()}
                                        className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 text-sm font-mono" />
                                    <button onClick={applyInput} className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 text-sm font-medium">Apply</button>
                                </div>
                            </div>

                            {/* Presets */}
                            <div className="flex flex-wrap gap-2 mb-6">
                                {Object.entries(PRESETS).map(([key]) => (
                                    <button key={key} onClick={() => applyPreset(key)}
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
                                    <span className="text-sm text-slate-500">{cur.phase}</span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-2">
                                    <div className="bg-rose-500 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${((currentStep + 1) / stepHistory.length) * 100}%` }} />
                                </div>
                            </div>

                            {/* Array visualization */}
                            <div className="mb-6 p-4 bg-slate-800/60 rounded-lg border border-slate-700/60">
                                <h3 className="text-sm font-semibold text-slate-300 mb-4">Array</h3>
                                <div className="overflow-x-auto">
                                    <div className="flex gap-2 mb-1 min-w-max">
                                        {cur.arr.map((val, idx) => (
                                            <div key={idx} className="flex flex-col items-center">
                                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-base border-2 transition-all duration-300 ${getElementStyle(idx)}`}>
                                                    {val}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Index labels */}
                                    <div className="flex gap-2 mb-3">
                                        {cur.arr.map((_, idx) => (
                                            <div key={idx} className="w-12 text-center text-xs text-slate-600">[{idx}]</div>
                                        ))}
                                    </div>
                                    {/* DP array */}
                                    <div className="border-t border-slate-700 pt-3 mt-1">
                                        <div className="text-xs text-slate-500 mb-2">dp[ ] = LIS length ending here</div>
                                        <div className="flex gap-2">
                                            {cur.dp.map((val, idx) => (
                                                <div key={idx} className={`w-12 h-10 rounded-lg flex items-center justify-center font-bold text-sm border-2 transition-all duration-300 ${getDPStyle(idx)}`}>
                                                    {val}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* LIS result */}
                                {cur.phase === 'complete' && cur.lisIndices.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-slate-700">
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-medium text-slate-400">LIS:</span>
                                            <div className="flex gap-1">
                                                {cur.lisIndices.map((idx, i) => (
                                                    <div key={i} className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm bg-green-600 text-white border-2 border-green-500">
                                                        {cur.arr[idx]}
                                                    </div>
                                                ))}
                                            </div>
                                            <span className="text-green-400 text-sm font-semibold">Length: {cur.lisIndices.length}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Bar chart visualization */}
                            <div className="mb-6 p-4 bg-slate-800/60 rounded-lg border border-slate-700/60">
                                <h3 className="text-sm font-semibold text-slate-300 mb-3">Value chart</h3>
                                <div className="flex items-end gap-1 h-24">
                                    {cur.arr.map((val, idx) => {
                                        const isCurrentI = idx === cur.currentI;
                                        const isCurrentJ = idx === cur.currentJ;
                                        const isInLIS = cur.lisIndices.includes(idx);
                                        const maxVal = Math.max(...cur.arr);
                                        const height = (val / maxVal) * 100;
                                        let color = 'bg-slate-600';
                                        if (cur.phase === 'complete' && isInLIS) color = 'bg-green-500';
                                        else if (isCurrentI) color = 'bg-rose-500';
                                        else if (isCurrentJ) color = 'bg-blue-500';
                                        return (
                                            <div key={idx} className="flex flex-col items-center flex-1">
                                                <div className={`w-full rounded-t transition-all duration-300 ${color}`} style={{ height: `${height}%` }} />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="flex flex-wrap gap-4 mb-4 text-xs text-slate-400">
                                {[
                                    ['bg-rose-500', 'Current i'],
                                    ['bg-blue-500', 'Comparing j'],
                                    ['bg-green-500', 'LIS element'],
                                ].map(([color, label]) => (
                                    <div key={label} className="flex items-center gap-1.5">
                                        <div className={`w-4 h-4 rounded ${color}`} /><span>{label}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Explanation */}
                            <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <Info className="h-5 w-5 text-rose-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-rose-200 text-sm leading-relaxed">{cur.explanation}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <div className="flex items-center gap-2 mb-4"><Clock className="h-5 w-5 text-rose-500" /><h3 className="font-bold text-white">Algorithm Details</h3></div>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between"><span className="text-slate-300">Time (DP):</span><code className="bg-yellow-500/15 text-yellow-400 px-2 py-1 rounded">O(n²)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Time (fast):</span><code className="bg-green-500/15 text-green-400 px-2 py-1 rounded">O(n log n)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Space:</span><code className="bg-blue-500/15 text-blue-400 px-2 py-1 rounded">O(n)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Type:</span><span className="bg-rose-500/15 text-rose-400 px-2 py-1 rounded text-xs">1D DP</span></div>
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">Key Concepts</h3>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Recurrence:</strong> dp[i] = max(dp[j]+1) for all j &lt; i where arr[j] &lt; arr[i]</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Base case:</strong> dp[i] = 1 (element alone)</span></li>
                                <li className="flex items-start gap-2"><Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Answer:</strong> max(dp[0..n-1])</span></li>
                                <li className="flex items-start gap-2"><Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Note:</strong> Multiple LIS of same max length may exist</span></li>
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
