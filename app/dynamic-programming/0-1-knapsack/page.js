"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Info, Clock, Code2, CheckCircle, XCircle, Package, Weight, DollarSign } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "What constraint makes this the '0/1' knapsack (not 'unbounded')?",
        options: ["Item values are 0 or 1", "Each item can be taken at most once", "Weight must be an integer", "Items are sorted by value"],
        correct: 1,
        explanation: "In 0/1 Knapsack each item is either included (1) or excluded (0) — at most once. Unbounded Knapsack allows multiple copies of the same item."
    },
    {
        question: "When item weight ≤ capacity w, how is dp[i][w] computed?",
        options: ["dp[i-1][w]", "values[i] + dp[i-1][w]", "max(values[i] + dp[i-1][w-weight[i]], dp[i-1][w])", "dp[i-1][w-weight[i]] + 1"],
        correct: 2,
        explanation: "We take the maximum of: (a) including item i — its value plus the best solution for the remaining capacity, or (b) excluding item i — the best solution without it."
    },
    {
        question: "How can knapsack space complexity be reduced from O(n×W) to O(W)?",
        options: ["Use binary search", "Process a single row, filling weights right-to-left", "Use a hash map instead of a 2D array", "Sort items by weight first"],
        correct: 1,
        explanation: "Using a single 1D dp array and filling it right-to-left ensures each item is counted at most once — the correct 0/1 behaviour with O(W) space."
    }
];

const KnapsackPage = () => {
    const [capacity, setCapacity] = useState(10);
    const [items, setItems] = useState([
        { id: 1, weight: 2, value: 3, name: "Gem" },
        { id: 2, weight: 3, value: 4, name: "Phone" },
        { id: 3, weight: 4, value: 5, name: "Laptop" },
        { id: 4, weight: 5, value: 6, name: "Camera" }
    ]);
    const [originalCapacity] = useState(10);
    const [originalItems] = useState([
        { id: 1, weight: 2, value: 3, name: "Gem" },
        { id: 2, weight: 3, value: 4, name: "Phone" },
        { id: 3, weight: 4, value: 5, name: "Laptop" },
        { id: 4, weight: 5, value: 6, name: "Camera" }
    ]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(800);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const generateKnapsackSteps = (W, itemList) => {
        const steps = [];
        const n = itemList.length;
        const dp = Array(n + 1).fill().map(() => Array(W + 1).fill(0));

        steps.push({
            dp: dp.map(r => [...r]), currentItem: -1, currentWeight: -1, decision: '',
            explanation: `Initialize 0/1 Knapsack DP table: ${n} items, capacity ${W}. dp[i][w] = max value using first i items with capacity w.`,
            phase: 'initialize', selectedItems: [], knapsackWeight: 0, knapsackValue: 0, comparing: null
        });

        for (let i = 1; i <= n; i++) {
            const item = itemList[i - 1];
            steps.push({
                dp: dp.map(r => [...r]), currentItem: i - 1, currentWeight: -1, decision: '',
                explanation: `Processing item ${i}: "${item.name}" (weight: ${item.weight}, value: ${item.value}). For each capacity, decide: include or exclude?`,
                phase: 'processing_item', selectedItems: [], knapsackWeight: 0, knapsackValue: 0, comparing: null
            });

            for (let w = 1; w <= W; w++) {
                steps.push({
                    dp: dp.map(r => [...r]), currentItem: i - 1, currentWeight: w, decision: '',
                    explanation: `Capacity ${w}: Can we include "${item.name}" (weight ${item.weight})?`,
                    phase: 'checking_capacity', selectedItems: [], knapsackWeight: 0, knapsackValue: 0, comparing: null
                });

                if (item.weight <= w) {
                    const inclVal = item.value + dp[i - 1][w - item.weight];
                    const exclVal = dp[i - 1][w];
                    steps.push({
                        dp: dp.map(r => [...r]), currentItem: i - 1, currentWeight: w, decision: 'comparing',
                        explanation: `Compare: Include "${item.name}" = ${item.value} + dp[${i - 1}][${w - item.weight}] = ${inclVal}  vs  Exclude = dp[${i - 1}][${w}] = ${exclVal}`,
                        phase: 'comparing', selectedItems: [], knapsackWeight: 0, knapsackValue: 0,
                        comparing: { include: inclVal, exclude: exclVal, better: inclVal > exclVal ? 'include' : 'exclude' }
                    });

                    if (inclVal > exclVal) {
                        dp[i][w] = inclVal;
                        steps.push({
                            dp: dp.map(r => [...r]), currentItem: i - 1, currentWeight: w, decision: 'include',
                            explanation: `Include "${item.name}"! Value ${inclVal} > ${exclVal}. dp[${i}][${w}] = ${inclVal}.`,
                            phase: 'decision_made', selectedItems: [], knapsackWeight: 0, knapsackValue: 0,
                            comparing: { include: inclVal, exclude: exclVal, better: 'include' }
                        });
                    } else {
                        dp[i][w] = exclVal;
                        steps.push({
                            dp: dp.map(r => [...r]), currentItem: i - 1, currentWeight: w, decision: 'exclude',
                            explanation: `Exclude "${item.name}". Value ${exclVal} >= ${inclVal}. dp[${i}][${w}] = ${exclVal}.`,
                            phase: 'decision_made', selectedItems: [], knapsackWeight: 0, knapsackValue: 0,
                            comparing: { include: inclVal, exclude: exclVal, better: 'exclude' }
                        });
                    }
                } else {
                    dp[i][w] = dp[i - 1][w];
                    steps.push({
                        dp: dp.map(r => [...r]), currentItem: i - 1, currentWeight: w, decision: 'too_heavy',
                        explanation: `"${item.name}" too heavy (${item.weight} > ${w}). dp[${i}][${w}] = dp[${i - 1}][${w}] = ${dp[i][w]}.`,
                        phase: 'too_heavy', selectedItems: [], knapsackWeight: 0, knapsackValue: 0, comparing: null
                    });
                }
            }
        }

        // Backtrack
        steps.push({
            dp: dp.map(r => [...r]), currentItem: -1, currentWeight: -1, decision: '',
            explanation: `DP table complete. Maximum value = ${dp[n][W]}. Backtracking to find selected items.`,
            phase: 'backtrack_start', selectedItems: [], knapsackWeight: 0, knapsackValue: 0, comparing: null
        });

        const sel = []; let w = W, tw = 0, tv = 0;
        for (let i = n; i > 0 && w > 0; i--) {
            const item = itemList[i - 1];
            if (dp[i][w] !== dp[i - 1][w]) {
                sel.push(item); tw += item.weight; tv += item.value;
                steps.push({
                    dp: dp.map(r => [...r]), currentItem: i - 1, currentWeight: w, decision: 'selected',
                    explanation: `"${item.name}" was included! dp[${i}][${w}] ≠ dp[${i - 1}][${w}]. Total weight: ${tw}, value: ${tv}.`,
                    phase: 'backtracking', selectedItems: [...sel], knapsackWeight: tw, knapsackValue: tv, comparing: null
                });
                w -= item.weight;
            } else {
                steps.push({
                    dp: dp.map(r => [...r]), currentItem: i - 1, currentWeight: w, decision: 'not_selected',
                    explanation: `"${item.name}" was excluded. dp[${i}][${w}] = dp[${i - 1}][${w}].`,
                    phase: 'backtracking', selectedItems: [...sel], knapsackWeight: tw, knapsackValue: tv, comparing: null
                });
            }
        }

        steps.push({
            dp: dp.map(r => [...r]), currentItem: -1, currentWeight: -1, decision: '',
            explanation: `Optimal solution: max value = ${tv}, total weight = ${tw}/${W}. Items: ${sel.map(it => it.name).join(', ')}.`,
            phase: 'complete', selectedItems: [...sel], knapsackWeight: tw, knapsackValue: tv, comparing: null
        });

        return steps;
    };

    useEffect(() => {
        setStepHistory(generateKnapsackSteps(capacity, items));
        setCurrentStep(0);
    }, [capacity, items]);

    useEffect(() => {
        if (isPlaying && currentStep < stepHistory.length - 1) {
            const t = setTimeout(() => setCurrentStep(p => p + 1), speed);
            return () => clearTimeout(t);
        } else if (currentStep >= stepHistory.length - 1) setIsPlaying(false);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const reset = () => { setIsPlaying(false); setCurrentStep(0); };

    const generateNewProblem = () => {
        const templates = [
            { name: "Diamond", weights: [1, 2, 3], values: [3, 4, 5] },
            { name: "Phone", weights: [2, 3, 4], values: [2, 3, 4] },
            { name: "Laptop", weights: [4, 5, 6], values: [5, 6, 7] },
            { name: "Camera", weights: [3, 4, 5], values: [4, 5, 6] },
            { name: "Console", weights: [3, 4, 5], values: [3, 4, 5] },
            { name: "Watch", weights: [1, 2], values: [2, 3] },
            { name: "Headphones", weights: [1, 2, 3], values: [2, 3, 4] },
            { name: "Book", weights: [1, 2], values: [1, 2] }
        ];
        const n = Math.floor(Math.random() * 3) + 3;
        const shuffled = [...templates].sort(() => 0.5 - Math.random()).slice(0, n);
        setCapacity(Math.floor(Math.random() * 8) + 8);
        setItems(shuffled.map((t, idx) => ({
            id: idx + 1, name: t.name,
            weight: t.weights[Math.floor(Math.random() * t.weights.length)],
            value: t.values[Math.floor(Math.random() * t.values.length)]
        })));
        setIsPlaying(false); setCurrentStep(0);
    };

    const currentState = stepHistory[currentStep] || {
        dp: [], currentItem: -1, currentWeight: -1, decision: '',
        explanation: 'Click Play to begin', phase: 'start',
        selectedItems: [], knapsackWeight: 0, knapsackValue: 0, comparing: null
    };

    const getDpCellColor = (i, j, val) => {
        const isCurrent = i - 1 === currentState.currentItem && j === currentState.currentWeight;
        if (isCurrent) {
            if (currentState.decision === 'include') return 'bg-green-600 text-white border-green-500 transform scale-110';
            if (currentState.decision === 'exclude') return 'bg-orange-500 text-white border-orange-400 transform scale-110';
            if (currentState.decision === 'too_heavy') return 'bg-red-600 text-white border-red-500 transform scale-110';
            return 'bg-rose-500 text-white border-rose-400 transform scale-110';
        }
        if (i === 0 || j === 0) return 'bg-slate-700 text-slate-400 border-slate-600';
        if (val === 0) return 'bg-slate-800 text-slate-500 border-slate-700';
        const tiers = ['bg-rose-900 text-rose-300 border-rose-800', 'bg-rose-700 text-rose-100 border-rose-600', 'bg-rose-500 text-white border-rose-400'];
        return tiers[Math.min(Math.floor(val / 4), 2)];
    };

    const getItemColor = (item, index) => {
        if (currentState.selectedItems.some(s => s.id === item.id)) return 'bg-green-600/30 text-green-200 border-green-500 transform scale-105';
        if (index === currentState.currentItem) return 'bg-rose-500/30 text-rose-200 border-rose-400 transform scale-105';
        return 'bg-slate-700/50 text-slate-200 border-slate-600';
    };

    const handleAnswer = (i) => {
        if (quizState.answered) return;
        setQuizState(p => ({ ...p, selected: i, answered: true, score: i === quizQuestions[p.current].correct ? p.score + 1 : p.score }));
    };
    const nextQ = () => {
        if (quizState.current < quizQuestions.length - 1) setQuizState(p => ({ ...p, current: p.current + 1, selected: null, answered: false }));
        else setQuizState(p => ({ ...p, complete: true }));
    };

    const codeExample = `def knapsack_01(weights, values, capacity):
    n = len(weights)
    dp = [[0] * (capacity + 1) for _ in range(n + 1)]

    for i in range(1, n + 1):
        for w in range(1, capacity + 1):
            if weights[i-1] > w:
                dp[i][w] = dp[i-1][w]          # Too heavy, exclude
            else:
                include = values[i-1] + dp[i-1][w - weights[i-1]]
                exclude = dp[i-1][w]
                dp[i][w] = max(include, exclude)

    return dp[n][capacity]

# Space-optimized O(W)
def knapsack_1d(weights, values, capacity):
    dp = [0] * (capacity + 1)
    for i in range(len(weights)):
        for w in range(capacity, weights[i] - 1, -1):  # right-to-left!
            dp[w] = max(dp[w], values[i] + dp[w - weights[i]])
    return dp[capacity]`;

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
                            <Package className="h-10 w-10" />0/1 Knapsack Problem
                        </h1>
                        <p className="text-xl text-rose-100 mb-6 max-w-3xl mx-auto">
                            Watch 2D DP decide — for each item at each capacity — whether to include or exclude it to maximize total value.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Time: O(n × W)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(n × W)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">2D DP Table</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Optimization</div>
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
                                <button onClick={generateNewProblem} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium">Random</button>
                                <button onClick={() => { setCapacity(originalCapacity); setItems([...originalItems]); setIsPlaying(false); setCurrentStep(0); }} className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium">Original</button>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2 text-slate-300">Knapsack Capacity: {capacity}</label>
                                <input type="range" min="5" max="20" value={capacity} onChange={e => setCapacity(Number(e.target.value))} className="w-full max-w-md accent-rose-500" />
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

                            {/* Items + Knapsack */}
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-slate-300 mb-3">Items &amp; Knapsack</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-800/60 rounded-lg border border-slate-700/60">
                                    <div>
                                        <h4 className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Available Items</h4>
                                        <div className="space-y-2">
                                            {items.map((item, idx) => (
                                                <div key={item.id} className={`p-3 rounded-lg border-2 transition-all duration-500 ${getItemColor(item, idx)}`}>
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-semibold text-sm">{item.name}</span>
                                                        <div className="flex gap-3 text-xs">
                                                            <span className="flex items-center gap-1"><Weight className="w-3 h-3" />{item.weight}</span>
                                                            <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{item.value}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Knapsack ({currentState.knapsackWeight}/{capacity})</h4>
                                        <div className="bg-slate-800 rounded-lg border border-slate-700 p-3 min-h-[140px]">
                                            <div className="w-full bg-slate-700 rounded h-3 mb-3">
                                                <div className="bg-gradient-to-r from-rose-500 to-pink-500 h-3 rounded transition-all duration-500"
                                                    style={{ width: `${Math.min((currentState.knapsackWeight / capacity) * 100, 100)}%` }} />
                                            </div>
                                            <div className="space-y-1">
                                                {currentState.selectedItems.map(item => (
                                                    <div key={item.id} className="flex justify-between items-center bg-green-500/15 border border-green-500/30 rounded px-2 py-1">
                                                        <span className="text-green-300 text-xs font-medium">{item.name}</span>
                                                        <div className="flex gap-2 text-xs text-green-400"><span>W:{item.weight}</span><span>V:{item.value}</span></div>
                                                    </div>
                                                ))}
                                                {currentState.selectedItems.length === 0 && <div className="text-slate-600 text-xs text-center py-4">Empty</div>}
                                            </div>
                                            {currentState.knapsackValue > 0 && (
                                                <div className="mt-2 pt-2 border-t border-slate-700 flex justify-between text-xs text-slate-300">
                                                    <span>Weight: <strong>{currentState.knapsackWeight}</strong></span>
                                                    <span>Value: <strong className="text-green-400">{currentState.knapsackValue}</strong></span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {currentState.comparing && (
                                    <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                        <div className="flex gap-4 text-sm">
                                            <div className={`flex-1 p-2 rounded border ${currentState.comparing.better === 'include' ? 'border-green-500 bg-green-500/10 text-green-300' : 'border-slate-600 text-slate-400'}`}>
                                                <div className="text-xs mb-0.5">Include</div>
                                                <div className="font-bold">{currentState.comparing.include}</div>
                                            </div>
                                            <div className={`flex-1 p-2 rounded border ${currentState.comparing.better === 'exclude' ? 'border-orange-400 bg-orange-500/10 text-orange-300' : 'border-slate-600 text-slate-400'}`}>
                                                <div className="text-xs mb-0.5">Exclude</div>
                                                <div className="font-bold">{currentState.comparing.exclude}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* DP Table */}
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-slate-300 mb-3">DP Table — Max Value</h3>
                                <div className="overflow-auto p-4 bg-slate-800/60 rounded-lg border border-slate-700/60">
                                    {currentState.dp.length > 0 && (
                                        <table className="border-collapse text-xs">
                                            <thead>
                                                <tr>
                                                    <th className="w-12 h-7 border border-slate-600 bg-slate-800 text-slate-400 font-normal px-1">Item\Cap</th>
                                                    {Array.from({ length: capacity + 1 }, (_, i) => <th key={i} className="w-10 h-7 border border-slate-600 bg-slate-800 text-slate-300 font-bold">{i}</th>)}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {currentState.dp.map((row, i) => (
                                                    <tr key={i}>
                                                        <th className="w-12 h-7 border border-slate-600 bg-slate-800 text-slate-300 font-bold px-1">{i === 0 ? '∅' : items[i - 1]?.name || i}</th>
                                                        {row.map((val, j) => (
                                                            <td key={j} className={`w-10 h-7 text-center border border-slate-700 font-bold transition-all duration-300 ${getDpCellColor(i, j, val)}`}>{val}</td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
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
                                <div className="flex justify-between"><span className="text-slate-300">Time:</span><code className="bg-yellow-500/15 text-yellow-400 px-2 py-1 rounded">O(n × W)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Space (2D):</span><code className="bg-yellow-500/15 text-yellow-400 px-2 py-1 rounded">O(n × W)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Space (1D opt):</span><code className="bg-green-500/15 text-green-400 px-2 py-1 rounded">O(W)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Type:</span><span className="bg-rose-500/15 text-rose-400 px-2 py-1 rounded">2D DP Table</span></div>
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">Key Concepts</h3>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">0/1 Constraint:</strong> each item taken at most once</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">State:</strong> dp[i][w] = max value, first i items, capacity w</span></li>
                                <li className="flex items-start gap-2"><Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Recurrence:</strong> max(include, exclude)</span></li>
                                <li className="flex items-start gap-2"><Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Base case:</strong> dp[0][w] = 0 (no items)</span></li>
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

export default KnapsackPage;
