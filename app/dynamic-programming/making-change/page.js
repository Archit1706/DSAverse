"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Lightbulb, Clock, Code2, Coins } from 'lucide-react';

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

    const generateCoinChangeSteps = (targetAmount, coinTypes) => {
        const steps = [];
        const dp = new Array(targetAmount + 1).fill(Infinity);
        const parent = new Array(targetAmount + 1).fill(-1);
        dp[0] = 0;

        steps.push({
            dp: [...dp],
            parent: [...parent],
            currentAmount: -1,
            currentCoin: -1,
            comparison: null,
            explanation: `🎯 Initialize DP table: dp[i] = minimum coins needed for amount i. dp[0] = 0 (base case), others = ∞`,
            phase: 'initialize',
            coins: [...coinTypes],
            solution: []
        });

        for (let i = 1; i <= targetAmount; i++) {
            steps.push({
                dp: [...dp],
                parent: [...parent],
                currentAmount: i,
                currentCoin: -1,
                comparison: null,
                explanation: `💰 Computing minimum coins needed for amount ${i}`,
                phase: 'start_amount',
                coins: [...coinTypes],
                solution: []
            });

            for (let j = 0; j < coinTypes.length; j++) {
                const coin = coinTypes[j];

                if (coin <= i) {
                    const currentMin = dp[i];
                    const newOption = dp[i - coin] + 1;

                    steps.push({
                        dp: [...dp],
                        parent: [...parent],
                        currentAmount: i,
                        currentCoin: coin,
                        comparison: { current: currentMin, newOption: newOption, better: newOption < currentMin },
                        explanation: `🪙 Trying coin ${coin}: dp[${i}] = min(${currentMin === Infinity ? '∞' : currentMin}, dp[${i - coin}] + 1) = min(${currentMin === Infinity ? '∞' : currentMin}, ${dp[i - coin] === Infinity ? '∞' : dp[i - coin]} + 1) = min(${currentMin === Infinity ? '∞' : currentMin}, ${newOption === Infinity ? '∞' : newOption})`,
                        phase: 'trying_coin',
                        coins: [...coinTypes],
                        solution: []
                    });

                    if (newOption < dp[i]) {
                        dp[i] = newOption;
                        parent[i] = coin;

                        steps.push({
                            dp: [...dp],
                            parent: [...parent],
                            currentAmount: i,
                            currentCoin: coin,
                            comparison: { current: currentMin, newOption: newOption, better: true },
                            explanation: `✅ Better solution found! Updated dp[${i}] = ${newOption} using coin ${coin}`,
                            phase: 'updated',
                            coins: [...coinTypes],
                            solution: []
                        });
                    } else {
                        steps.push({
                            dp: [...dp],
                            parent: [...parent],
                            currentAmount: i,
                            currentCoin: coin,
                            comparison: { current: currentMin, newOption: newOption, better: false },
                            explanation: `❌ No improvement: ${newOption} ≥ ${currentMin === Infinity ? '∞' : currentMin}, keeping current solution`,
                            phase: 'no_update',
                            coins: [...coinTypes],
                            solution: []
                        });
                    }
                } else {
                    steps.push({
                        dp: [...dp],
                        parent: [...parent],
                        currentAmount: i,
                        currentCoin: coin,
                        comparison: null,
                        explanation: `⛔ Cannot use coin ${coin} for amount ${i} (coin > amount)`,
                        phase: 'invalid_coin',
                        coins: [...coinTypes],
                        solution: []
                    });
                }
            }

            steps.push({
                dp: [...dp],
                parent: [...parent],
                currentAmount: i,
                currentCoin: -1,
                comparison: null,
                explanation: `✨ Completed amount ${i}: minimum coins needed = ${dp[i] === Infinity ? 'impossible' : dp[i]}`,
                phase: 'amount_complete',
                coins: [...coinTypes],
                solution: []
            });
        }

        // Reconstruct solution
        const solutionCoins = [];
        let current = targetAmount;
        const reconstructionSteps = [];

        if (dp[targetAmount] !== Infinity) {
            steps.push({
                dp: [...dp],
                parent: [...parent],
                currentAmount: targetAmount,
                currentCoin: -1,
                comparison: null,
                explanation: `🔍 Reconstructing optimal solution by backtracking through parent array`,
                phase: 'reconstruct_start',
                coins: [...coinTypes],
                solution: [...solutionCoins]
            });

            while (current > 0 && parent[current] !== -1) {
                const coinUsed = parent[current];
                solutionCoins.push(coinUsed);
                reconstructionSteps.push(current);

                steps.push({
                    dp: [...dp],
                    parent: [...parent],
                    currentAmount: current,
                    currentCoin: coinUsed,
                    comparison: null,
                    explanation: `🔙 For amount ${current}, used coin ${coinUsed}. Next: amount ${current - coinUsed}`,
                    phase: 'reconstructing',
                    coins: [...coinTypes],
                    solution: [...solutionCoins]
                });

                current -= coinUsed;
            }
        }

        steps.push({
            dp: [...dp],
            parent: [...parent],
            currentAmount: -1,
            currentCoin: -1,
            comparison: null,
            explanation: dp[targetAmount] === Infinity ?
                `❌ No solution exists! Cannot make amount ${targetAmount} with coins [${coinTypes.join(', ')}]` :
                `🎉 Solution found! Minimum coins for amount ${targetAmount} = ${dp[targetAmount]}. Coins used: [${solutionCoins.join(', ')}]`,
            phase: 'complete',
            coins: [...coinTypes],
            solution: [...solutionCoins]
        });

        return steps;
    };

    useEffect(() => {
        const steps = generateCoinChangeSteps(amount, coins);
        setStepHistory(steps);
        setCurrentStep(0);
    }, [amount, coins]);

    useEffect(() => {
        if (isPlaying && currentStep < stepHistory.length - 1) {
            const timer = setTimeout(() => {
                setCurrentStep(prev => prev + 1);
            }, speed);
            return () => clearTimeout(timer);
        } else if (currentStep >= stepHistory.length - 1) {
            setIsPlaying(false);
        }
    }, [isPlaying, currentStep, stepHistory, speed]);

    const startVisualization = () => setIsPlaying(true);
    const pauseVisualization = () => setIsPlaying(false);
    const resetVisualization = () => {
        setIsPlaying(false);
        setCurrentStep(0);
    };

    const stepForward = () => {
        if (currentStep < stepHistory.length - 1) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const stepBackward = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const generateNewProblem = () => {
        const newAmount = Math.floor(Math.random() * 15) + 8; // 8-22
        const coinSets = [
            [1, 3, 4],
            [1, 4, 5],
            [2, 3, 5],
            [1, 5, 10],
            [1, 2, 5]
        ];
        const newCoins = coinSets[Math.floor(Math.random() * coinSets.length)];
        setAmount(newAmount);
        setCoins(newCoins);
        setIsPlaying(false);
        setCurrentStep(0);
    };

    const resetToOriginal = () => {
        setAmount(originalAmount);
        setCoins([...originalCoins]);
        setIsPlaying(false);
        setCurrentStep(0);
    };

    const updateCoins = (newCoinString) => {
        try {
            const newCoins = newCoinString.split(',').map(c => parseInt(c.trim())).filter(c => !isNaN(c) && c > 0);
            if (newCoins.length > 0) {
                setCoins(newCoins.sort((a, b) => a - b));
            }
        } catch (e) {
            // Invalid input, ignore
        }
    };

    const currentState = stepHistory[currentStep] || {
        dp: Array(amount + 1).fill(Infinity),
        parent: Array(amount + 1).fill(-1),
        currentAmount: -1,
        currentCoin: -1,
        comparison: null,
        explanation: 'Click Start to begin the coin change visualization',
        phase: 'start',
        coins: [...coins],
        solution: []
    };

    const getDpCellColor = (index, value) => {
        if (index === 0) return 'bg-green-500 text-white'; // Base case
        if (index === currentState.currentAmount) {
            if (currentState.phase === 'updated') return 'bg-rose-600 text-white border-rose-700 transform scale-105';
            return 'bg-rose-500 text-white border-rose-600';
        }
        if (value === Infinity) return 'bg-gray-200 text-gray-500';
        if (value <= 3) return 'bg-rose-400 text-white';
        if (value <= 6) return 'bg-rose-300 text-rose-800';
        return 'bg-rose-200 text-rose-700';
    };

    const getCoinColor = (coin) => {
        if (coin === currentState.currentCoin) {
            if (currentState.comparison?.better) return 'bg-green-500 text-white border-green-600 transform scale-110';
            if (currentState.comparison?.better === false) return 'bg-red-500 text-white border-red-600 transform scale-110';
            return 'bg-rose-500 text-white border-rose-600 transform scale-110';
        }
        if (currentState.solution.includes(coin)) return 'bg-amber-400 text-amber-900 border-amber-500';
        return 'bg-blue-400 text-blue-900 border-blue-500';
    };

    const codeExample = `def coin_change(amount, coins):
    # Initialize DP table
    dp = [float('inf')] * (amount + 1)
    dp[0] = 0  # Base case: 0 coins needed for amount 0
    
    # Fill DP table
    for i in range(1, amount + 1):
        for coin in coins:
            if coin <= i:
                dp[i] = min(dp[i], dp[i - coin] + 1)
    
    return dp[amount] if dp[amount] != float('inf') else -1

# With solution reconstruction
def coin_change_with_solution(amount, coins):
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
    
    # Reconstruct solution
    solution = []
    current = amount
    while current > 0:
        coin = parent[current]
        solution.append(coin)
        current -= coin
    
    return dp[amount], solution

# Time Complexity: O(amount × len(coins))
# Space Complexity: O(amount)`;

    return (
        <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-rose-500 to-pink-500 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex items-center mb-6">
                        <Link href="/dynamic-programming" className="flex items-center text-white hover:text-rose-200 transition-colors mr-4">
                            <ArrowLeft className="h-5 w-5 mr-2" />
                            Back to Dynamic Programming
                        </Link>
                    </div>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4 flex items-center justify-center gap-3">
                            <Coins className="h-12 w-12" />
                            Making Change Visualizer
                        </h1>
                        <p className="text-xl text-rose-100 mb-6 max-w-3xl mx-auto">
                            Watch how dynamic programming finds the minimum number of coins needed to make change for any amount.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Time: O(amount × coins)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(amount)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Bottom-up DP</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Optimal substructure</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Visualization */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                            {/* Controls */}
                            <div className="flex flex-wrap gap-3 mb-6">
                                <button
                                    onClick={isPlaying ? pauseVisualization : startVisualization}
                                    className="flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors font-medium"
                                    disabled={currentStep >= stepHistory.length - 1 && !isPlaying}
                                >
                                    {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                                    {isPlaying ? 'Pause' : 'Play'}
                                </button>

                                <button
                                    onClick={stepBackward}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                                    disabled={isPlaying || currentStep === 0}
                                >
                                    <SkipBack size={18} />
                                    Step Back
                                </button>

                                <button
                                    onClick={stepForward}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                                    disabled={isPlaying || currentStep >= stepHistory.length - 1}
                                >
                                    <SkipForward size={18} />
                                    Step Forward
                                </button>

                                <button
                                    onClick={resetVisualization}
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium"
                                >
                                    <RotateCcw size={18} />
                                    Reset
                                </button>

                                <button
                                    onClick={generateNewProblem}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                                >
                                    Random Problem
                                </button>

                                <button
                                    onClick={resetToOriginal}
                                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium"
                                >
                                    Original Problem
                                </button>
                            </div>

                            {/* Input Controls */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700">
                                        Target Amount: {amount}
                                    </label>
                                    <input
                                        type="range"
                                        min="5"
                                        max="25"
                                        value={amount}
                                        onChange={(e) => setAmount(Number(e.target.value))}
                                        className="w-full accent-rose-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700">
                                        Available Coins
                                    </label>
                                    <input
                                        type="text"
                                        value={coins.join(', ')}
                                        onChange={(e) => updateCoins(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        placeholder="1, 4, 5"
                                    />
                                </div>
                            </div>

                            {/* Speed Control */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2 text-gray-700">
                                    Animation Speed: {speed}ms
                                </label>
                                <input
                                    type="range"
                                    min="300"
                                    max="2000"
                                    value={speed}
                                    onChange={(e) => setSpeed(Number(e.target.value))}
                                    className="w-full max-w-md accent-rose-500"
                                />
                                <div className="flex justify-between text-xs text-gray-500 max-w-md mt-1">
                                    <span>Fast (300ms)</span>
                                    <span>Slow (2000ms)</span>
                                </div>
                            </div>

                            {/* Progress */}
                            <div className="mb-6">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-gray-700">
                                        Progress: Step {currentStep + 1} of {stepHistory.length}
                                    </span>
                                    <span className="text-sm text-gray-500">
                                        Phase: {currentState.phase}
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-rose-500 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${((currentStep + 1) / stepHistory.length) * 100}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* Available Coins */}
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Available Coins</h3>
                                <div className="flex flex-wrap gap-3 p-4 bg-rose-50 rounded-lg border-2 border-rose-200">
                                    {currentState.coins.map((coin, index) => (
                                        <div
                                            key={index}
                                            className={`flex items-center justify-center w-16 h-16 rounded-full font-bold text-lg border-4 transition-all duration-500 ${getCoinColor(coin)}`}
                                        >
                                            {coin}
                                        </div>
                                    ))}
                                </div>
                                {currentState.comparison && (
                                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                        <div className="text-sm text-yellow-800">
                                            <strong>Comparison:</strong> Current = {currentState.comparison.current === Infinity ? '∞' : currentState.comparison.current},
                                            New option = {currentState.comparison.newOption === Infinity ? '∞' : currentState.comparison.newOption}
                                            {currentState.comparison.better && <span className="text-green-600 font-semibold"> → Better!</span>}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* DP Table */}
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">DP Table (Minimum Coins Needed)</h3>
                                <div className="overflow-x-auto">
                                    <div className="inline-flex gap-1 p-4 bg-rose-50 rounded-lg border-2 border-rose-200 min-w-full">
                                        {currentState.dp.map((value, index) => (
                                            <div key={index} className="text-center min-w-[60px]">
                                                <div className="text-xs text-gray-600 mb-1">dp[{index}]</div>
                                                <div
                                                    className={`w-14 h-14 rounded border-2 flex items-center justify-center text-sm font-bold transition-all duration-500 ${getDpCellColor(index, value)}`}
                                                >
                                                    {value === Infinity ? '∞' : value}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">amt:{index}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Solution Visualization */}
                            {currentState.solution.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Optimal Solution</h3>
                                    <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
                                        <div className="flex items-center justify-center space-x-2 mb-3">
                                            <span className="text-green-700 font-medium">Coins used:</span>
                                            {currentState.solution.map((coin, index) => (
                                                <div
                                                    key={index}
                                                    className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-400 text-amber-900 font-bold border-2 border-amber-500"
                                                >
                                                    {coin}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="text-center text-green-800 font-semibold">
                                            Total coins: {currentState.solution.length} | Sum: {currentState.solution.reduce((a, b) => a + b, 0)}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Current Step Explanation */}
                            <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <Lightbulb className="h-5 w-5 text-rose-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h3 className="font-semibold text-rose-800 mb-2">Current Step:</h3>
                                        <p className="text-rose-700 leading-relaxed">{currentState.explanation}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Algorithm Info */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Clock className="h-5 w-5 text-rose-600" />
                                <h3 className="font-bold text-gray-900">Algorithm Details</h3>
                            </div>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-700">Time Complexity:</span>
                                    <code className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">O(amount × coins)</code>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-700">Space Complexity:</span>
                                    <code className="bg-blue-100 text-blue-800 px-2 py-1 rounded">O(amount)</code>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-700">Type:</span>
                                    <span className="bg-rose-100 text-rose-800 px-2 py-1 rounded">Bottom-up DP</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-700">Pattern:</span>
                                    <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">Unbounded Knapsack</span>
                                </div>
                            </div>
                        </div>

                        {/* Real-world Applications */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="font-bold text-gray-900 mb-4">Real-world Applications</h3>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li className="flex items-start gap-2">
                                    <span className="text-rose-600 mt-1">•</span>
                                    <span>Cashier systems and vending machines</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-rose-600 mt-1">•</span>
                                    <span>Currency exchange optimization</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-rose-600 mt-1">•</span>
                                    <span>Resource allocation in systems</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-rose-600 mt-1">•</span>
                                    <span>Inventory management</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-rose-600 mt-1">•</span>
                                    <span>Network packet routing optimization</span>
                                </li>
                            </ul>
                        </div>

                        {/* Key Concepts */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="font-bold text-gray-900 mb-4">Key DP Concepts</h3>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li className="flex items-start gap-2">
                                    <span className="text-green-600 mt-1">✓</span>
                                    <span><strong>Optimal Substructure:</strong> Optimal solution contains optimal subsolutions</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-600 mt-1">✓</span>
                                    <span><strong>Overlapping Subproblems:</strong> Same subproblems appear multiple times</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">ℹ</span>
                                    <span><strong>Recurrence:</strong> dp[i] = min(dp[i], dp[i-coin] + 1)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">ℹ</span>
                                    <span><strong>Base Case:</strong> dp[0] = 0 (zero coins for amount 0)</span>
                                </li>
                            </ul>
                        </div>

                        {/* Variants */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="font-bold text-gray-900 mb-4">Problem Variants</h3>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>Count number of ways to make change</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>Maximum coins with limited supply</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>Minimum/maximum value with coin weights</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>Coin change with exact denominations</span>
                                </li>
                            </ul>
                        </div>

                        {/* Code Toggle */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <button
                                onClick={() => setShowCode(!showCode)}
                                className="flex items-center gap-2 text-rose-600 hover:text-rose-700 font-medium"
                            >
                                <Code2 className="h-5 w-5" />
                                {showCode ? 'Hide' : 'Show'} Python Code
                            </button>

                            {showCode && (
                                <div className="mt-4">
                                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
                                        <code>{codeExample}</code>
                                    </pre>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CoinChangePage;