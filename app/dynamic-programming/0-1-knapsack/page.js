"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Lightbulb, Clock, Code2, Package, Weight, DollarSign } from 'lucide-react';

const KnapsackPage = () => {
    const [capacity, setCapacity] = useState(10);
    const [items, setItems] = useState([
        { id: 1, weight: 2, value: 3, name: "💎 Gem" },
        { id: 2, weight: 3, value: 4, name: "📱 Phone" },
        { id: 3, weight: 4, value: 5, name: "💻 Laptop" },
        { id: 4, weight: 5, value: 6, name: "📷 Camera" }
    ]);
    const [originalCapacity] = useState(10);
    const [originalItems] = useState([
        { id: 1, weight: 2, value: 3, name: "💎 Gem" },
        { id: 2, weight: 3, value: 4, name: "📱 Phone" },
        { id: 3, weight: 4, value: 5, name: "💻 Laptop" },
        { id: 4, weight: 5, value: 6, name: "📷 Camera" }
    ]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(800);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);

    const generateKnapsackSteps = (knapsackCapacity, itemList) => {
        const steps = [];
        const n = itemList.length;
        const W = knapsackCapacity;
        const dp = Array(n + 1).fill().map(() => Array(W + 1).fill(0));

        steps.push({
            dp: dp.map(row => [...row]),
            currentItem: -1,
            currentWeight: -1,
            decision: '',
            explanation: `🎯 Initialize 0/1 Knapsack DP table for ${n} items and capacity ${W}. Base case: dp[0][w] = 0 (no items means 0 value)`,
            phase: 'initialize',
            selectedItems: [],
            knapsackWeight: 0,
            knapsackValue: 0,
            comparing: null
        });

        // Fill DP table
        for (let i = 1; i <= n; i++) {
            const item = itemList[i - 1];

            steps.push({
                dp: dp.map(row => [...row]),
                currentItem: i - 1,
                currentWeight: -1,
                decision: '',
                explanation: `📦 Processing ${item.name} (weight: ${item.weight}, value: ${item.value}). For each weight capacity, decide: include or exclude?`,
                phase: 'processing_item',
                selectedItems: [],
                knapsackWeight: 0,
                knapsackValue: 0,
                comparing: null
            });

            for (let w = 1; w <= W; w++) {
                steps.push({
                    dp: dp.map(row => [...row]),
                    currentItem: i - 1,
                    currentWeight: w,
                    decision: '',
                    explanation: `⚖️ Capacity ${w}: Can we include ${item.name} (weight ${item.weight})?`,
                    phase: 'checking_capacity',
                    selectedItems: [],
                    knapsackWeight: 0,
                    knapsackValue: 0,
                    comparing: null
                });

                if (item.weight <= w) {
                    const includeValue = item.value + dp[i - 1][w - item.weight];
                    const excludeValue = dp[i - 1][w];

                    steps.push({
                        dp: dp.map(row => [...row]),
                        currentItem: i - 1,
                        currentWeight: w,
                        decision: 'comparing',
                        explanation: `🔍 Compare options: Include ${item.name} = ${item.value} + dp[${i - 1}][${w - item.weight}] = ${item.value} + ${dp[i - 1][w - item.weight]} = ${includeValue} vs Exclude = dp[${i - 1}][${w}] = ${excludeValue}`,
                        phase: 'comparing',
                        selectedItems: [],
                        knapsackWeight: 0,
                        knapsackValue: 0,
                        comparing: { include: includeValue, exclude: excludeValue, better: includeValue > excludeValue ? 'include' : 'exclude' }
                    });

                    if (includeValue > excludeValue) {
                        dp[i][w] = includeValue;
                        steps.push({
                            dp: dp.map(row => [...row]),
                            currentItem: i - 1,
                            currentWeight: w,
                            decision: 'include',
                            explanation: `✅ Include ${item.name}! Value ${includeValue} > ${excludeValue}. Updated dp[${i}][${w}] = ${includeValue}`,
                            phase: 'decision_made',
                            selectedItems: [],
                            knapsackWeight: 0,
                            knapsackValue: 0,
                            comparing: { include: includeValue, exclude: excludeValue, better: 'include' }
                        });
                    } else {
                        dp[i][w] = excludeValue;
                        steps.push({
                            dp: dp.map(row => [...row]),
                            currentItem: i - 1,
                            currentWeight: w,
                            decision: 'exclude',
                            explanation: `❌ Exclude ${item.name}. Value ${excludeValue} ≥ ${includeValue}. Keep dp[${i}][${w}] = ${excludeValue}`,
                            phase: 'decision_made',
                            selectedItems: [],
                            knapsackWeight: 0,
                            knapsackValue: 0,
                            comparing: { include: includeValue, exclude: excludeValue, better: 'exclude' }
                        });
                    }
                } else {
                    dp[i][w] = dp[i - 1][w];
                    steps.push({
                        dp: dp.map(row => [...row]),
                        currentItem: i - 1,
                        currentWeight: w,
                        decision: 'too_heavy',
                        explanation: `⛔ ${item.name} too heavy (${item.weight} > ${w}). Keep previous value: dp[${i}][${w}] = dp[${i - 1}][${w}] = ${dp[i][w]}`,
                        phase: 'too_heavy',
                        selectedItems: [],
                        knapsackWeight: 0,
                        knapsackValue: 0,
                        comparing: null
                    });
                }
            }
        }

        // Backtrack to find solution
        steps.push({
            dp: dp.map(row => [...row]),
            currentItem: -1,
            currentWeight: -1,
            decision: '',
            explanation: `🔍 Backtracking to find optimal solution. Starting from dp[${n}][${W}] = ${dp[n][W]}`,
            phase: 'backtrack_start',
            selectedItems: [],
            knapsackWeight: 0,
            knapsackValue: 0,
            comparing: null
        });

        const selectedItems = [];
        let w = W;
        let totalWeight = 0;
        let totalValue = 0;

        for (let i = n; i > 0 && w > 0; i--) {
            const item = itemList[i - 1];

            if (dp[i][w] !== dp[i - 1][w]) {
                selectedItems.push(item);
                totalWeight += item.weight;
                totalValue += item.value;

                steps.push({
                    dp: dp.map(row => [...row]),
                    currentItem: i - 1,
                    currentWeight: w,
                    decision: 'selected',
                    explanation: `✨ ${item.name} selected! dp[${i}][${w}] ≠ dp[${i - 1}][${w}] means this item was included. New weight: ${totalWeight}, value: ${totalValue}`,
                    phase: 'backtracking',
                    selectedItems: [...selectedItems],
                    knapsackWeight: totalWeight,
                    knapsackValue: totalValue,
                    comparing: null
                });

                w -= item.weight;
            } else {
                steps.push({
                    dp: dp.map(row => [...row]),
                    currentItem: i - 1,
                    currentWeight: w,
                    decision: 'not_selected',
                    explanation: `⏭️ ${item.name} not selected. dp[${i}][${w}] = dp[${i - 1}][${w}] means this item was excluded`,
                    phase: 'backtracking',
                    selectedItems: [...selectedItems],
                    knapsackWeight: totalWeight,
                    knapsackValue: totalValue,
                    comparing: null
                });
            }
        }

        steps.push({
            dp: dp.map(row => [...row]),
            currentItem: -1,
            currentWeight: -1,
            decision: '',
            explanation: `🎉 Optimal solution found! Maximum value: ${totalValue}, Total weight: ${totalWeight}/${W}. Items: ${selectedItems.map(item => item.name).join(', ')}`,
            phase: 'complete',
            selectedItems: [...selectedItems],
            knapsackWeight: totalWeight,
            knapsackValue: totalValue,
            comparing: null
        });

        return steps;
    };

    useEffect(() => {
        const steps = generateKnapsackSteps(capacity, items);
        setStepHistory(steps);
        setCurrentStep(0);
    }, [capacity, items]);

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
        const itemTemplates = [
            { name: "💎 Diamond", weight: [1, 2, 3], value: [3, 4, 5] },
            { name: "📱 Phone", weight: [2, 3, 4], value: [2, 3, 4] },
            { name: "💻 Laptop", weight: [4, 5, 6], value: [5, 6, 7] },
            { name: "📷 Camera", weight: [3, 4, 5], value: [4, 5, 6] },
            { name: "🎮 Console", weight: [3, 4, 5], value: [3, 4, 5] },
            { name: "⌚ Watch", weight: [1, 2], value: [2, 3] },
            { name: "🎧 Headphones", weight: [1, 2, 3], value: [2, 3, 4] },
            { name: "📚 Book", weight: [1, 2], value: [1, 2] }
        ];

        const numItems = Math.floor(Math.random() * 3) + 3; // 3-5 items
        const newCapacity = Math.floor(Math.random() * 8) + 8; // 8-15 capacity
        const shuffled = [...itemTemplates].sort(() => 0.5 - Math.random());

        const newItems = shuffled.slice(0, numItems).map((template, index) => {
            const weightOptions = template.weight;
            const valueOptions = template.value;
            const weight = weightOptions[Math.floor(Math.random() * weightOptions.length)];
            const value = valueOptions[Math.floor(Math.random() * valueOptions.length)];

            return {
                id: index + 1,
                weight,
                value,
                name: template.name
            };
        });

        setCapacity(newCapacity);
        setItems(newItems);
        setIsPlaying(false);
        setCurrentStep(0);
    };

    const resetToOriginal = () => {
        setCapacity(originalCapacity);
        setItems([...originalItems]);
        setIsPlaying(false);
        setCurrentStep(0);
    };

    const currentState = stepHistory[currentStep] || {
        dp: [],
        currentItem: -1,
        currentWeight: -1,
        decision: '',
        explanation: 'Click Start to begin the 0/1 Knapsack visualization',
        phase: 'start',
        selectedItems: [],
        knapsackWeight: 0,
        knapsackValue: 0,
        comparing: null
    };

    const getDpCellColor = (i, j, value) => {
        const isCurrentCell = i - 1 === currentState.currentItem && j === currentState.currentWeight;

        if (isCurrentCell) {
            if (currentState.decision === 'include') return 'bg-green-500 text-white border-green-600 transform scale-110';
            if (currentState.decision === 'exclude') return 'bg-orange-500 text-white border-orange-600 transform scale-110';
            if (currentState.decision === 'too_heavy') return 'bg-red-500 text-white border-red-600 transform scale-110';
            return 'bg-rose-500 text-white border-rose-600 transform scale-110';
        }

        if (i === 0 || j === 0) return 'bg-gray-300 text-gray-700 border-gray-400';
        if (value === 0) return 'bg-gray-100 text-gray-500 border-gray-300';
        if (value <= 5) return 'bg-rose-200 text-rose-800 border-rose-300';
        if (value <= 10) return 'bg-rose-300 text-rose-800 border-rose-400';
        if (value <= 15) return 'bg-rose-400 text-white border-rose-500';
        return 'bg-rose-500 text-white border-rose-600';
    };

    const getItemColor = (item, index) => {
        const isCurrentItem = index === currentState.currentItem;
        const isSelected = currentState.selectedItems.some(selected => selected.id === item.id);

        if (isSelected) return 'bg-green-500 text-white border-green-600 transform scale-105';
        if (isCurrentItem) return 'bg-rose-500 text-white border-rose-600 transform scale-110';
        return 'bg-blue-200 text-blue-800 border-blue-300';
    };

    const codeExample = `def knapsack_01(weights, values, capacity):
    n = len(weights)
    # Create DP table
    dp = [[0 for _ in range(capacity + 1)] for _ in range(n + 1)]
    
    # Fill DP table
    for i in range(1, n + 1):
        for w in range(1, capacity + 1):
            # If current item weight exceeds capacity
            if weights[i-1] > w:
                dp[i][w] = dp[i-1][w]  # Exclude item
            else:
                # Choose maximum of include vs exclude
                include = values[i-1] + dp[i-1][w - weights[i-1]]
                exclude = dp[i-1][w]
                dp[i][w] = max(include, exclude)
    
    return dp[n][capacity]

def knapsack_with_items(weights, values, capacity):
    n = len(weights)
    dp = [[0 for _ in range(capacity + 1)] for _ in range(n + 1)]
    
    # Fill DP table
    for i in range(1, n + 1):
        for w in range(1, capacity + 1):
            if weights[i-1] > w:
                dp[i][w] = dp[i-1][w]
            else:
                dp[i][w] = max(
                    values[i-1] + dp[i-1][w - weights[i-1]],
                    dp[i-1][w]
                )
    
    # Backtrack to find selected items
    w = capacity
    selected_items = []
    for i in range(n, 0, -1):
        if dp[i][w] != dp[i-1][w]:
            selected_items.append(i-1)
            w -= weights[i-1]
    
    return dp[n][capacity], selected_items[::-1]

# Time Complexity: O(n × capacity)
# Space Complexity: O(n × capacity)`;

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
                            <Package className="h-12 w-12" />
                            0/1 Knapsack Problem
                        </h1>
                        <p className="text-xl text-rose-100 mb-6 max-w-3xl mx-auto">
                            Watch how 2D dynamic programming solves the classic optimization problem of maximizing value within weight constraints.
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
                                    Original
                                </button>
                            </div>

                            {/* Capacity Control */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2 text-gray-700">
                                    Knapsack Capacity: {capacity}
                                </label>
                                <input
                                    type="range"
                                    min="5"
                                    max="20"
                                    value={capacity}
                                    onChange={(e) => setCapacity(Number(e.target.value))}
                                    className="w-full max-w-md accent-rose-500"
                                />
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

                            {/* Items and Knapsack Visualization */}
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Items & Knapsack</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-rose-50 rounded-lg border-2 border-rose-200">
                                    {/* Available Items */}
                                    <div>
                                        <h4 className="font-medium text-gray-700 mb-3">Available Items</h4>
                                        <div className="space-y-2">
                                            {items.map((item, index) => (
                                                <div
                                                    key={item.id}
                                                    className={`p-3 rounded-lg border-2 transition-all duration-500 ${getItemColor(item, index)}`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-medium">{item.name}</span>
                                                        <div className="flex items-center space-x-3 text-sm">
                                                            <div className="flex items-center">
                                                                <Weight className="w-4 h-4 mr-1" />
                                                                {item.weight}
                                                            </div>
                                                            <div className="flex items-center">
                                                                <DollarSign className="w-4 h-4 mr-1" />
                                                                {item.value}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Knapsack */}
                                    <div>
                                        <h4 className="font-medium text-gray-700 mb-3">
                                            Knapsack ({currentState.knapsackWeight}/{capacity})
                                        </h4>
                                        <div className="bg-white rounded-lg border-2 border-gray-300 p-4 min-h-[200px]">
                                            {/* Knapsack Visual */}
                                            <div className="relative">
                                                <div className="w-full bg-gray-200 rounded-lg h-4 mb-4">
                                                    <div
                                                        className="bg-gradient-to-r from-rose-400 to-pink-500 h-4 rounded-lg transition-all duration-500"
                                                        style={{ width: `${Math.min((currentState.knapsackWeight / capacity) * 100, 100)}%` }}
                                                    ></div>
                                                </div>

                                                {/* Selected Items */}
                                                <div className="space-y-2">
                                                    {currentState.selectedItems.map((item, index) => (
                                                        <div key={item.id} className="flex items-center justify-between bg-green-100 p-2 rounded border border-green-300">
                                                            <span className="text-sm font-medium text-green-800">{item.name}</span>
                                                            <div className="flex items-center space-x-2 text-xs text-green-600">
                                                                <span>W:{item.weight}</span>
                                                                <span>V:{item.value}</span>
                                                            </div>
                                                        </div>
                                                    ))}

                                                    {currentState.selectedItems.length === 0 && (
                                                        <div className="text-gray-500 text-center py-8">
                                                            Empty knapsack
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Stats */}
                                                <div className="mt-4 pt-4 border-t border-gray-200">
                                                    <div className="flex justify-between text-sm">
                                                        <span>Total Weight: <strong>{currentState.knapsackWeight}</strong></span>
                                                        <span>Total Value: <strong>{currentState.knapsackValue}</strong></span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Comparison Display */}
                                {currentState.comparing && (
                                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                        <div className="text-sm text-yellow-800">
                                            <strong>Decision Analysis:</strong> Include = {currentState.comparing.include},
                                            Exclude = {currentState.comparing.exclude}
                                            <span className={`ml-2 font-semibold ${currentState.comparing.better === 'include' ? 'text-green-600' : 'text-orange-600'}`}>
                                                → {currentState.comparing.better === 'include' ? 'Include!' : 'Exclude!'}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* DP Table */}
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">DP Table (Max Value)</h3>
                                <div className="overflow-auto p-4 bg-rose-50 rounded-lg border-2 border-rose-200">
                                    {currentState.dp.length > 0 && (
                                        <div className="inline-block">
                                            <table className="border-collapse">
                                                <thead>
                                                    <tr>
                                                        <th className="w-12 h-8 text-xs border border-gray-400 bg-gray-200">Items\\Cap</th>
                                                        {Array.from({ length: capacity + 1 }, (_, i) => (
                                                            <th key={i} className="w-12 h-8 text-xs border border-gray-400 bg-gray-200">{i}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {currentState.dp.map((row, i) => (
                                                        <tr key={i}>
                                                            <th className="w-12 h-8 text-xs border border-gray-400 bg-gray-200">
                                                                {i === 0 ? '∅' : items[i - 1]?.name.split(' ')[1] || i}
                                                            </th>
                                                            {row.map((value, j) => (
                                                                <td
                                                                    key={j}
                                                                    className={`w-12 h-8 text-center border border-gray-400 text-xs font-bold transition-all duration-500 ${getDpCellColor(i, j, value)}`}
                                                                >
                                                                    {value}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>

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
                                    <code className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">O(n × W)</code>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-700">Space Complexity:</span>
                                    <code className="bg-blue-100 text-blue-800 px-2 py-1 rounded">O(n × W)</code>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-700">Space Optimized:</span>
                                    <code className="bg-green-100 text-green-800 px-2 py-1 rounded">O(W)</code>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-700">Type:</span>
                                    <span className="bg-rose-100 text-rose-800 px-2 py-1 rounded">2D DP Table</span>
                                </div>
                            </div>
                        </div>

                        {/* Real-world Applications */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="font-bold text-gray-900 mb-4">Real-world Applications</h3>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li className="flex items-start gap-2">
                                    <span className="text-rose-600 mt-1">•</span>
                                    <span>Portfolio optimization in finance</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-rose-600 mt-1">•</span>
                                    <span>Resource allocation in project management</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-rose-600 mt-1">•</span>
                                    <span>Cargo loading optimization</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-rose-600 mt-1">•</span>
                                    <span>Memory allocation in operating systems</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-rose-600 mt-1">•</span>
                                    <span>Investment decision making</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-rose-600 mt-1">•</span>
                                    <span>Feature selection in machine learning</span>
                                </li>
                            </ul>
                        </div>

                        {/* Key Concepts */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="font-bold text-gray-900 mb-4">Key DP Concepts</h3>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li className="flex items-start gap-2">
                                    <span className="text-green-600 mt-1">✓</span>
                                    <span><strong>0/1 Constraint:</strong> Each item can be taken at most once</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-600 mt-1">✓</span>
                                    <span><strong>State:</strong> dp[i][w] = max value using first i items with capacity w</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">ℹ</span>
                                    <span><strong>Recurrence:</strong> dp[i][w] = max(include, exclude)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">ℹ</span>
                                    <span><strong>Base Case:</strong> dp[0][w] = 0 (no items = no value)</span>
                                </li>
                            </ul>
                        </div>

                        {/* Optimization Tips */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="font-bold text-gray-900 mb-4">Optimization Tips</h3>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>Use 1D array for space optimization: O(W)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>Process weights in reverse for 1D approach</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>Early termination if capacity exceeded</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>Sort items by value/weight ratio for heuristics</span>
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

export default KnapsackPage;