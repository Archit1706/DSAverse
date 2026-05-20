"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Info, Clock, Code2, CheckCircle, XCircle, Coins } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const quizQuestions = [
    {
        question: "What DP approach does the Coin Change problem use?",
        options: ["Top-down memoization", "Bottom-up tabulation", "Greedy algorithm", "Backtracking"],
        correct: 1,
        explanation: "Coin Change uses bottom-up tabulation: we fill a DP table iteratively from amount 0 up to the target, building on previously solved subproblems."
    },
    {
        question: "What does dp[0] = 0 represent in coin change?",
        options: ["Zero coins with denomination 0", "Zero coins are needed to make amount 0", "The first coin denomination", "An impossible amount"],
        correct: 1,
        explanation: "dp[0] = 0 is the base case: you need zero coins to make amount 0. Every other dp[i] builds on this foundation."
    },
    {
        question: "What knapsack pattern does coin change follow?",
        options: ["0/1 Knapsack (each item once)", "Fractional Knapsack", "Unbounded Knapsack (items reusable)", "Bounded Knapsack"],
        correct: 2,
        explanation: "Coin change is Unbounded Knapsack — coins can be reused any number of times. This is why we iterate forward (not backward) in the amount loop."
    }
];

const CoinChangePage = () => {
    const [amount, setAmount] = useState(11);
    const [coins, setCoins] = useState([1, 4, 5]);
    const [originalAmount] = useState(11);
    const [originalCoins] = useState([1, 4, 5]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1000);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const generateCoinChangeSteps = (targetAmount, coinTypes) => {
        const steps = [];
        const dp = new Array(targetAmount + 1).fill(Infinity);
        const parent = new Array(targetAmount + 1).fill(-1);
        dp[0] = 0;

        steps.push({
            dp: [...dp], parent: [...parent],
            currentAmount: -1, currentCoin: -1, comparison: null,
            explanation: `Initialize DP table: dp[i] = minimum coins for amount i. dp[0] = 0 (base case), all others = ∞.`,
            phase: 'initialize', coins: [...coinTypes], solution: []
        });

        for (let i = 1; i <= targetAmount; i++) {
            steps.push({
                dp: [...dp], parent: [...parent],
                currentAmount: i, currentCoin: -1, comparison: null,
                explanation: `Computing minimum coins for amount ${i}.`,
                phase: 'start_amount', coins: [...coinTypes], solution: []
            });

            for (const coin of coinTypes) {
                if (coin <= i) {
                    const cur = dp[i];
                    const candidate = dp[i - coin] + 1;
                    steps.push({
                        dp: [...dp], parent: [...parent],
                        currentAmount: i, currentCoin: coin,
                        comparison: { current: cur, newOption: candidate, better: candidate < cur },
                        explanation: `Trying coin ${coin}: dp[${i}] = min(${cur === Infinity ? '∞' : cur}, dp[${i - coin}]+1) = min(${cur === Infinity ? '∞' : cur}, ${dp[i - coin] === Infinity ? '∞' : dp[i - coin]}+1) = ${candidate === Infinity ? '∞' : candidate}`,
                        phase: 'trying_coin', coins: [...coinTypes], solution: []
                    });

                    if (candidate < dp[i]) {
                        dp[i] = candidate;
                        parent[i] = coin;
                        steps.push({
                            dp: [...dp], parent: [...parent],
                            currentAmount: i, currentCoin: coin,
                            comparison: { current: cur, newOption: candidate, better: true },
                            explanation: `Better! Updated dp[${i}] = ${candidate} using coin ${coin}.`,
                            phase: 'updated', coins: [...coinTypes], solution: []
                        });
                    } else {
                        steps.push({
                            dp: [...dp], parent: [...parent],
                            currentAmount: i, currentCoin: coin,
                            comparison: { current: cur, newOption: candidate, better: false },
                            explanation: `No improvement: ${candidate === Infinity ? '∞' : candidate} ≥ ${cur === Infinity ? '∞' : cur}, keeping current.`,
                            phase: 'no_update', coins: [...coinTypes], solution: []
                        });
                    }
                } else {
                    steps.push({
                        dp: [...dp], parent: [...parent],
                        currentAmount: i, currentCoin: coin, comparison: null,
                        explanation: `Coin ${coin} exceeds amount ${i} — cannot use.`,
                        phase: 'invalid_coin', coins: [...coinTypes], solution: []
                    });
                }
            }

            steps.push({
                dp: [...dp], parent: [...parent],
                currentAmount: i, currentCoin: -1, comparison: null,
                explanation: `Amount ${i} solved: minimum coins = ${dp[i] === Infinity ? 'impossible' : dp[i]}.`,
                phase: 'amount_complete', coins: [...coinTypes], solution: []
            });
        }

        const solution = [];
        let cur = targetAmount;
        if (dp[targetAmount] !== Infinity) {
            steps.push({
                dp: [...dp], parent: [...parent],
                currentAmount: targetAmount, currentCoin: -1, comparison: null,
                explanation: `Backtracking through parent array to reconstruct the optimal coin sequence.`,
                phase: 'reconstruct_start', coins: [...coinTypes], solution: []
            });

            while (cur > 0 && parent[cur] !== -1) {
                const c = parent[cur];
                solution.push(c);
                steps.push({
                    dp: [...dp], parent: [...parent],
                    currentAmount: cur, currentCoin: c, comparison: null,
                    explanation: `At amount ${cur}: used coin ${c}. Remaining: ${cur - c}.`,
                    phase: 'reconstructing', coins: [...coinTypes], solution: [...solution]
                });
                cur -= c;
            }
        }

        steps.push({
            dp: [...dp], parent: [...parent],
            currentAmount: -1, currentCoin: -1, comparison: null,
            explanation: dp[targetAmount] === Infinity
                ? `No solution exists. Cannot make amount ${targetAmount} with coins [${coinTypes.join(', ')}].`
                : `Complete! Minimum coins for ${targetAmount} = ${dp[targetAmount]}. Coins used: [${solution.join(', ')}].`,
            phase: 'complete', coins: [...coinTypes], solution: [...solution]
        });

        return steps;
    };

    useEffect(() => {
        setStepHistory(generateCoinChangeSteps(amount, coins));
        setCurrentStep(0);
    }, [amount, coins]);

    useEffect(() => {
        if (isPlaying && currentStep < stepHistory.length - 1) {
            const t = setTimeout(() => setCurrentStep(p => p + 1), speed);
            return () => clearTimeout(t);
        } else if (currentStep >= stepHistory.length - 1) setIsPlaying(false);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const reset = () => { setIsPlaying(false); setCurrentStep(0); };

    const generateNewProblem = () => {
        const newAmount = Math.floor(Math.random() * 15) + 8;
        const coinSets = [[1, 3, 4], [1, 4, 5], [2, 3, 5], [1, 5, 10], [1, 2, 5]];
        setAmount(newAmount);
        setCoins(coinSets[Math.floor(Math.random() * coinSets.length)]);
        setIsPlaying(false); setCurrentStep(0);
    };

    const updateCoins = (str) => {
        const parsed = str.split(',').map(c => parseInt(c.trim())).filter(c => !isNaN(c) && c > 0);
        if (parsed.length > 0) setCoins(parsed.sort((a, b) => a - b));
    };

    const currentState = stepHistory[currentStep] || {
        dp: Array(amount + 1).fill(Infinity), parent: Array(amount + 1).fill(-1),
        currentAmount: -1, currentCoin: -1, comparison: null,
        explanation: 'Click Play to begin', phase: 'start', coins: [...coins], solution: []
    };

    const getDpColor = (index, value) => {
        if (index === 0) return 'bg-green-600 text-white border-green-500';
        if (index === currentState.currentAmount) {
            if (currentState.phase === 'updated') return 'bg-rose-600 text-white border-rose-400 transform scale-105';
            return 'bg-rose-500 text-white border-rose-400';
        }
        if (value === Infinity) return 'bg-slate-700 text-slate-500 border-slate-600';
        const levels = ['bg-rose-900 text-rose-300 border-rose-800', 'bg-rose-700 text-rose-100 border-rose-600', 'bg-rose-500 text-white border-rose-400'];
        return levels[Math.min(Math.floor(value / 3), 2)];
    };

    const getCoinColor = (coin) => {
        if (coin === currentState.currentCoin) {
            if (currentState.comparison?.better) return 'bg-green-500 text-white border-green-400 transform scale-110';
            if (currentState.comparison?.better === false) return 'bg-red-500 text-white border-red-400 transform scale-110';
            return 'bg-rose-500 text-white border-rose-400 transform scale-110';
        }
        if (currentState.solution.includes(coin)) return 'bg-amber-500 text-white border-amber-400';
        return 'bg-slate-600 text-slate-200 border-slate-500';
    };

    const handleAnswer = (i) => {
        if (quizState.answered) return;
        setQuizState(p => ({ ...p, selected: i, answered: true, score: i === quizQuestions[p.current].correct ? p.score + 1 : p.score }));
    };
    const nextQ = () => {
        if (quizState.current < quizQuestions.length - 1) setQuizState(p => ({ ...p, current: p.current + 1, selected: null, answered: false }));
        else setQuizState(p => ({ ...p, complete: true }));
    };

    const codeExample = `def coin_change(amount, coins):
    dp = [float('inf')] * (amount + 1)
    dp[0] = 0  # Base case

    for i in range(1, amount + 1):
        for coin in coins:
            if coin <= i:
                dp[i] = min(dp[i], dp[i - coin] + 1)

    return dp[amount] if dp[amount] != float('inf') else -1

def coin_change_with_reconstruction(amount, coins):
    dp = [float('inf')] * (amount + 1)
    parent = [-1] * (amount + 1)
    dp[0] = 0

    for i in range(1, amount + 1):
        for coin in coins:
            if coin <= i and dp[i - coin] + 1 < dp[i]:
                dp[i] = dp[i - coin] + 1
                parent[i] = coin

    if dp[amount] == float('inf'):
        return -1, []

    solution, cur = [], amount
    while cur > 0:
        solution.append(parent[cur])
        cur -= parent[cur]
    return dp[amount], solution`;

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
                            <Coins className="h-10 w-10" />Making Change Visualizer
                        </h1>
                        <p className="text-xl text-rose-100 mb-6 max-w-3xl mx-auto">
                            Watch bottom-up DP find the minimum number of coins for any target amount, building from amount 0 upward.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Time: O(amount × coins)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(amount)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Bottom-up DP</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Unbounded Knapsack</div>
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
                                <button onClick={() => { if (currentStep > 0) setCurrentStep(p => p - 1); }} className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium" disabled={isPlaying || currentStep === 0}>
                                    <SkipBack size={18} />Step Back
                                </button>
                                <button onClick={() => { if (currentStep < stepHistory.length - 1) setCurrentStep(p => p + 1); }} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium" disabled={isPlaying || currentStep >= stepHistory.length - 1}>
                                    <SkipForward size={18} />Step Forward
                                </button>
                                <button onClick={reset} className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium">
                                    <RotateCcw size={18} />Reset
                                </button>
                                <button onClick={generateNewProblem} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium">Random</button>
                                <button onClick={() => { setAmount(originalAmount); setCoins([...originalCoins]); setIsPlaying(false); setCurrentStep(0); }} className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium">Original</button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-slate-300">Target Amount: {amount}</label>
                                    <input type="range" min="5" max="25" value={amount} onChange={e => setAmount(Number(e.target.value))} className="w-full accent-rose-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-slate-300">Available Coins (comma-separated)</label>
                                    <input type="text" value={coins.join(', ')} onChange={e => updateCoins(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-100 placeholder-slate-500" placeholder="1, 4, 5" />
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2 text-slate-300">Animation Speed: {speed}ms</label>
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

                            {/* Coins */}
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-slate-300 mb-3">Available Coins</h3>
                                <div className="flex flex-wrap gap-3 p-4 bg-slate-800/60 rounded-lg border border-slate-700/60">
                                    {currentState.coins.map((coin, i) => (
                                        <div key={i} className={`flex items-center justify-center w-14 h-14 rounded-full font-bold text-lg border-4 transition-all duration-500 ${getCoinColor(coin)}`}>{coin}</div>
                                    ))}
                                </div>
                                {currentState.comparison && (
                                    <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                        <span className="text-sm text-yellow-300">
                                            <strong>Comparison:</strong> current = {currentState.comparison.current === Infinity ? '∞' : currentState.comparison.current}, candidate = {currentState.comparison.newOption === Infinity ? '∞' : currentState.comparison.newOption}
                                            {currentState.comparison.better && <span className="text-green-400 font-semibold"> — Updated!</span>}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* DP Table */}
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-slate-300 mb-3">DP Table — Minimum Coins per Amount</h3>
                                <div className="overflow-x-auto">
                                    <div className="inline-flex gap-1 p-4 bg-slate-800/60 rounded-lg border border-slate-700/60">
                                        {currentState.dp.map((val, i) => (
                                            <div key={i} className="text-center min-w-[52px]">
                                                <div className="text-xs text-slate-500 mb-1">dp[{i}]</div>
                                                <div className={`w-12 h-12 rounded border-2 flex items-center justify-center text-sm font-bold transition-all duration-500 ${getDpColor(i, val)}`}>
                                                    {val === Infinity ? '∞' : val}
                                                </div>
                                                <div className="text-xs text-slate-600 mt-1">{i}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Solution */}
                            {currentState.solution.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-sm font-semibold text-slate-300 mb-3">Optimal Solution</h3>
                                    <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                            <span className="text-green-300 text-sm font-medium">Coins:</span>
                                            {currentState.solution.map((c, i) => (
                                                <div key={i} className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm border-2 border-amber-400">{c}</div>
                                            ))}
                                        </div>
                                        <div className="text-green-300 text-sm font-medium">
                                            {currentState.solution.length} coin{currentState.solution.length !== 1 ? 's' : ''} — Sum: {currentState.solution.reduce((a, b) => a + b, 0)}
                                        </div>
                                    </div>
                                </div>
                            )}

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
                                <div className="flex justify-between"><span className="text-slate-300">Time:</span><code className="bg-yellow-500/15 text-yellow-400 px-2 py-1 rounded">O(amount × coins)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Space:</span><code className="bg-blue-500/15 text-blue-400 px-2 py-1 rounded">O(amount)</code></div>
                                <div className="flex justify-between"><span className="text-slate-300">Type:</span><span className="bg-rose-500/15 text-rose-400 px-2 py-1 rounded">Bottom-up DP</span></div>
                                <div className="flex justify-between"><span className="text-slate-300">Pattern:</span><span className="bg-purple-500/15 text-purple-400 px-2 py-1 rounded">Unbounded Knapsack</span></div>
                            </div>
                        </div>

                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h3 className="font-bold text-white mb-4">Key DP Concepts</h3>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Optimal Substructure:</strong> optimal solution for i uses optimal for i−coin</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Recurrence:</strong> dp[i] = min(dp[i], dp[i−coin]+1)</span></li>
                                <li className="flex items-start gap-2"><Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Base Case:</strong> dp[0] = 0</span></li>
                                <li className="flex items-start gap-2"><Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" /><span><strong className="text-slate-200">Sentinel:</strong> ∞ means "impossible so far"</span></li>
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

export default CoinChangePage;
