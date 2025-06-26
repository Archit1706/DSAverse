"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Lightbulb, Clock, Code2, Home, DollarSign, Shield } from 'lucide-react';

const HouseRobberPage = () => {
    const [houses, setHouses] = useState([2, 7, 9, 3, 1]);
    const [originalHouses] = useState([2, 7, 9, 3, 1]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1000);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);

    const generateHouseRobberSteps = (houseValues) => {
        const steps = [];
        const n = houseValues.length;
        const dp = new Array(n).fill(0);
        const decisions = new Array(n).fill('');

        if (n === 0) return steps;

        steps.push({
            dp: [...dp],
            decisions: [...decisions],
            currentHouse: -1,
            maxMoney: 0,
            robbedHouses: [],
            explanation: `🏠 Starting House Robber problem with ${n} houses. Goal: maximize money without robbing adjacent houses.`,
            phase: 'initialize',
            comparing: null
        });

        // Base case
        dp[0] = houseValues[0];
        decisions[0] = 'rob';

        steps.push({
            dp: [...dp],
            decisions: [...decisions],
            currentHouse: 0,
            maxMoney: dp[0],
            robbedHouses: [0],
            explanation: `🎯 Base case: Rob first house (index 0) with $${houseValues[0]}. dp[0] = ${dp[0]}`,
            phase: 'base_case',
            comparing: null
        });

        if (n > 1) {
            const robFirst = houseValues[0];
            const robSecond = houseValues[1];

            steps.push({
                dp: [...dp],
                decisions: [...decisions],
                currentHouse: 1,
                maxMoney: Math.max(robFirst, robSecond),
                robbedHouses: robSecond > robFirst ? [1] : [0],
                explanation: `🔍 House 1: Compare robbing house 0 ($${robFirst}) vs house 1 ($${robSecond}). Choose maximum.`,
                phase: 'comparing',
                comparing: { option1: robFirst, option2: robSecond, chosen: robSecond > robFirst ? 'house1' : 'house0' }
            });

            dp[1] = Math.max(houseValues[0], houseValues[1]);
            decisions[1] = houseValues[1] > houseValues[0] ? 'rob' : 'skip';

            steps.push({
                dp: [...dp],
                decisions: [...decisions],
                currentHouse: 1,
                maxMoney: dp[1],
                robbedHouses: houseValues[1] > houseValues[0] ? [1] : [0],
                explanation: `✅ dp[1] = max(${houseValues[0]}, ${houseValues[1]}) = ${dp[1]}. ${decisions[1] === 'rob' ? 'Rob' : 'Skip'} house 1.`,
                phase: 'decision_made',
                comparing: null
            });
        }

        // Fill remaining positions
        for (let i = 2; i < n; i++) {
            const robCurrent = houseValues[i] + dp[i - 2];
            const skipCurrent = dp[i - 1];

            steps.push({
                dp: [...dp],
                decisions: [...decisions],
                currentHouse: i,
                maxMoney: Math.max(robCurrent, skipCurrent),
                robbedHouses: [],
                explanation: `🏠 House ${i} ($${houseValues[i]}): Compare rob current = $${houseValues[i]} + dp[${i - 2}] = $${houseValues[i]} + $${dp[i - 2]} = $${robCurrent} vs skip current = dp[${i - 1}] = $${skipCurrent}`,
                phase: 'comparing',
                comparing: {
                    option1: robCurrent,
                    option2: skipCurrent,
                    chosen: robCurrent > skipCurrent ? 'rob' : 'skip',
                    robCurrent: `$${houseValues[i]} + dp[${i - 2}]`,
                    skipCurrent: `dp[${i - 1}]`
                }
            });

            if (robCurrent > skipCurrent) {
                dp[i] = robCurrent;
                decisions[i] = 'rob';
            } else {
                dp[i] = skipCurrent;
                decisions[i] = 'skip';
            }

            steps.push({
                dp: [...dp],
                decisions: [...decisions],
                currentHouse: i,
                maxMoney: dp[i],
                robbedHouses: [],
                explanation: `✨ dp[${i}] = max($${robCurrent}, $${skipCurrent}) = $${dp[i]}. ${decisions[i] === 'rob' ? 'Rob' : 'Skip'} house ${i}.`,
                phase: 'decision_made',
                comparing: null
            });
        }

        // Reconstruct solution
        steps.push({
            dp: [...dp],
            decisions: [...decisions],
            currentHouse: -1,
            maxMoney: dp[n - 1],
            robbedHouses: [],
            explanation: `🔍 Reconstructing optimal solution. Maximum money: $${dp[n - 1]}. Backtracking to find which houses to rob...`,
            phase: 'reconstruct_start',
            comparing: null
        });

        const robbedHouses = [];
        let i = n - 1;
        while (i >= 0) {
            if (i === 0 || (i >= 2 && dp[i] === houseValues[i] + dp[i - 2])) {
                robbedHouses.unshift(i);
                steps.push({
                    dp: [...dp],
                    decisions: [...decisions],
                    currentHouse: i,
                    maxMoney: dp[n - 1],
                    robbedHouses: [...robbedHouses],
                    explanation: `🎯 House ${i} robbed! dp[${i}] includes value from house ${i} ($${houseValues[i]})`,
                    phase: 'reconstructing',
                    comparing: null
                });
                i -= 2; // Skip adjacent house
            } else {
                steps.push({
                    dp: [...dp],
                    decisions: [...decisions],
                    currentHouse: i,
                    maxMoney: dp[n - 1],
                    robbedHouses: [...robbedHouses],
                    explanation: `⏭️ House ${i} skipped. dp[${i}] = dp[${i - 1}], so house ${i} was not robbed`,
                    phase: 'reconstructing',
                    comparing: null
                });
                i--;
            }
        }

        const totalMoney = robbedHouses.reduce((sum, index) => sum + houseValues[index], 0);
        steps.push({
            dp: [...dp],
            decisions: [...decisions],
            currentHouse: -1,
            maxMoney: totalMoney,
            robbedHouses: [...robbedHouses],
            explanation: `🎉 Optimal solution found! Rob houses [${robbedHouses.join(', ')}] for maximum money: $${totalMoney}. No adjacent houses robbed!`,
            phase: 'complete',
            comparing: null
        });

        return steps;
    };

    useEffect(() => {
        const steps = generateHouseRobberSteps(houses);
        setStepHistory(steps);
        setCurrentStep(0);
    }, [houses]);

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

    const generateNewHouses = () => {
        const numHouses = Math.floor(Math.random() * 4) + 4; // 4-7 houses
        const newHouses = Array.from({ length: numHouses }, () => Math.floor(Math.random() * 15) + 1);
        setHouses(newHouses);
        setIsPlaying(false);
        setCurrentStep(0);
    };

    const resetToOriginal = () => {
        setHouses([...originalHouses]);
        setIsPlaying(false);
        setCurrentStep(0);
    };

    const currentState = stepHistory[currentStep] || {
        dp: Array(houses.length).fill(0),
        decisions: Array(houses.length).fill(''),
        currentHouse: -1,
        maxMoney: 0,
        robbedHouses: [],
        explanation: 'Click Start to begin the House Robber visualization',
        phase: 'start',
        comparing: null
    };

    const getHouseColor = (index) => {
        const isCurrentHouse = index === currentState.currentHouse;
        const isRobbed = currentState.robbedHouses.includes(index);
        const isAdjacent = currentState.robbedHouses.some(robbedIndex => Math.abs(robbedIndex - index) === 1);

        if (isRobbed) return 'bg-green-500 text-white border-green-600 transform scale-110';
        if (isCurrentHouse) return 'bg-rose-500 text-white border-rose-600 transform scale-105';
        if (isAdjacent && currentState.phase === 'complete') return 'bg-red-200 text-red-800 border-red-300';
        return 'bg-blue-200 text-blue-800 border-blue-300';
    };

    const getDpCellColor = (index, value) => {
        const isCurrentCell = index === currentState.currentHouse;

        if (isCurrentCell) return 'bg-rose-500 text-white border-rose-600 transform scale-110';
        if (value === 0) return 'bg-gray-200 text-gray-500 border-gray-300';
        if (value <= 5) return 'bg-rose-200 text-rose-800 border-rose-300';
        if (value <= 10) return 'bg-rose-300 text-rose-800 border-rose-400';
        if (value <= 15) return 'bg-rose-400 text-white border-rose-500';
        return 'bg-rose-500 text-white border-rose-600';
    };

    const codeExample = `def rob(nums):
    if not nums:
        return 0
    if len(nums) == 1:
        return nums[0]
    
    # dp[i] = maximum money that can be robbed up to house i
    dp = [0] * len(nums)
    dp[0] = nums[0]
    dp[1] = max(nums[0], nums[1])
    
    for i in range(2, len(nums)):
        # Either rob current house + best up to i-2
        # Or skip current house and take best up to i-1
        dp[i] = max(nums[i] + dp[i-2], dp[i-1])
    
    return dp[-1]

# Space optimized version
def rob_optimized(nums):
    if not nums:
        return 0
    if len(nums) == 1:
        return nums[0]
    
    prev2 = nums[0]  # dp[i-2]
    prev1 = max(nums[0], nums[1])  # dp[i-1]
    
    for i in range(2, len(nums)):
        current = max(nums[i] + prev2, prev1)
        prev2 = prev1
        prev1 = current
    
    return prev1

# With solution reconstruction
def rob_with_houses(nums):
    if not nums:
        return 0, []
    if len(nums) == 1:
        return nums[0], [0]
    
    dp = [0] * len(nums)
    dp[0] = nums[0]
    dp[1] = max(nums[0], nums[1])
    
    for i in range(2, len(nums)):
        dp[i] = max(nums[i] + dp[i-2], dp[i-1])
    
    # Reconstruct solution
    robbed = []
    i = len(nums) - 1
    while i >= 0:
        if i == 0 or (i >= 2 and dp[i] == nums[i] + dp[i-2]):
            robbed.append(i)
            i -= 2
        else:
            i -= 1
    
    return dp[-1], robbed[::-1]

# Time Complexity: O(n)
# Space Complexity: O(1) optimized, O(n) with reconstruction`;

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
                            <Home className="h-12 w-12" />
                            House Robber Problem
                        </h1>
                        <p className="text-xl text-rose-100 mb-6 max-w-3xl mx-auto">
                            Watch how 1D dynamic programming finds the maximum money that can be robbed without hitting adjacent houses.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Time: O(n)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(1)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">1D DP Array</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Decision Making</div>
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
                                    onClick={generateNewHouses}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                                >
                                    Random Houses
                                </button>

                                <button
                                    onClick={resetToOriginal}
                                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium"
                                >
                                    Original
                                </button>
                            </div>

                            {/* House Values Input */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2 text-gray-700">
                                    House Values (comma-separated):
                                </label>
                                <input
                                    type="text"
                                    value={houses.join(', ')}
                                    onChange={(e) => {
                                        const values = e.target.value.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v) && v > 0);
                                        if (values.length > 0) {
                                            setHouses(values);
                                        }
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    placeholder="2, 7, 9, 3, 1"
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

                            {/* Neighborhood Visualization */}
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                                    Neighborhood ({currentState.robbedHouses.length > 0 ? `Robbed: $${currentState.maxMoney}` : 'Planning...'})
                                </h3>
                                <div className="p-6 bg-gradient-to-b from-blue-100 to-blue-200 rounded-lg border-2 border-blue-300 relative">
                                    {/* Street */}
                                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-gray-400 rounded-b-lg"></div>

                                    {/* Houses */}
                                    <div className="flex justify-center items-end space-x-6 relative z-10">
                                        {houses.map((money, index) => (
                                            <div key={index} className="text-center">
                                                {/* House */}
                                                <div
                                                    className={`relative w-20 h-24 transition-all duration-500 ${getHouseColor(index)} rounded-t-lg border-4 flex flex-col items-center justify-center`}
                                                >
                                                    {/* Roof */}
                                                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[16px] border-r-[16px] border-b-[16px] border-l-transparent border-r-transparent border-b-current opacity-80"></div>

                                                    {/* Money Icon */}
                                                    <DollarSign className="h-6 w-6 mb-1" />
                                                    <span className="font-bold text-lg">{money}</span>

                                                    {/* Security System */}
                                                    {currentState.robbedHouses.some(robbedIndex => Math.abs(robbedIndex - index) === 1) && currentState.phase === 'complete' && (
                                                        <Shield className="absolute -top-2 -right-2 h-4 w-4 text-red-500" />
                                                    )}

                                                    {/* Robber Icon */}
                                                    {currentState.robbedHouses.includes(index) && (
                                                        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-2xl">🥷</div>
                                                    )}
                                                </div>

                                                {/* House Number */}
                                                <div className="mt-2 text-sm text-gray-600">House {index}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Adjacent House Warning */}
                                    {currentState.phase === 'complete' && (
                                        <div className="mt-4 text-center">
                                            <div className="inline-flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                                                <Shield className="w-4 h-4 mr-1" />
                                                No adjacent houses robbed!
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Decision Comparison */}
                            {currentState.comparing && (
                                <div className="mb-6">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Decision Analysis</h3>
                                    <div className="grid grid-cols-2 gap-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                        <div className={`p-3 rounded border-2 transition-all ${currentState.comparing.chosen === 'rob' ? 'border-green-500 bg-green-100' : 'border-gray-300 bg-white'}`}>
                                            <div className="text-center">
                                                <div className="font-semibold text-gray-800">Rob Current</div>
                                                <div className="text-2xl font-bold text-green-600">${currentState.comparing.option1}</div>
                                                <div className="text-sm text-gray-600">{currentState.comparing.robCurrent}</div>
                                            </div>
                                        </div>
                                        <div className={`p-3 rounded border-2 transition-all ${currentState.comparing.chosen === 'skip' ? 'border-green-500 bg-green-100' : 'border-gray-300 bg-white'}`}>
                                            <div className="text-center">
                                                <div className="font-semibold text-gray-800">Skip Current</div>
                                                <div className="text-2xl font-bold text-orange-600">${currentState.comparing.option2}</div>
                                                <div className="text-sm text-gray-600">{currentState.comparing.skipCurrent}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* DP Array */}
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">DP Array (Maximum Money Up To Each House)</h3>
                                <div className="p-4 bg-rose-50 rounded-lg border-2 border-rose-200">
                                    <div className="grid grid-cols-1 gap-3">
                                        {/* DP Values */}
                                        <div className="flex justify-center gap-2">
                                            {currentState.dp.map((value, index) => (
                                                <div key={index} className="text-center">
                                                    <div className="text-xs text-gray-600 mb-1">dp[{index}]</div>
                                                    <div
                                                        className={`w-16 h-16 rounded-lg border-2 flex items-center justify-center font-bold text-sm transition-all duration-500 ${getDpCellColor(index, value)}`}
                                                    >
                                                        {value > 0 ? `$${value}` : '$0'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Decisions */}
                                        <div className="flex justify-center gap-2">
                                            {currentState.decisions.map((decision, index) => (
                                                <div key={index} className="text-center w-16">
                                                    <div className={`px-2 py-1 rounded text-xs font-medium ${decision === 'rob' ? 'bg-green-200 text-green-800' :
                                                            decision === 'skip' ? 'bg-orange-200 text-orange-800' :
                                                                'bg-gray-200 text-gray-600'
                                                        }`}>
                                                        {decision || '-'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Current Step Explanation */}
                            <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <Lightbulb className="h-5 w-5 text-rose-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h3 className="font-semibold text-rose-800 mb-2">Current Step:</h3>
                                        <p className="text-rose-700 leading-relaxed">{currentState.explanation}</p>
                                        {currentState.phase === 'complete' && (
                                            <div className="mt-3 p-3 bg-green-100 rounded border border-green-200">
                                                <div className="text-green-800 font-semibold">
                                                    🎉 Optimal Strategy: Rob houses [{currentState.robbedHouses.join(', ')}] for ${currentState.maxMoney}
                                                </div>
                                            </div>
                                        )}
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
                                    <code className="bg-green-100 text-green-800 px-2 py-1 rounded">O(n)</code>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-700">Space Complexity:</span>
                                    <code className="bg-green-100 text-green-800 px-2 py-1 rounded">O(1)</code>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-700">With Reconstruction:</span>
                                    <code className="bg-blue-100 text-blue-800 px-2 py-1 rounded">O(n)</code>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-700">Type:</span>
                                    <span className="bg-rose-100 text-rose-800 px-2 py-1 rounded">1D DP Array</span>
                                </div>
                            </div>
                        </div>

                        {/* Real-world Applications */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="font-bold text-gray-900 mb-4">Real-world Applications</h3>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li className="flex items-start gap-2">
                                    <span className="text-rose-600 mt-1">•</span>
                                    <span>Job scheduling with conflicts</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-rose-600 mt-1">•</span>
                                    <span>Maximum profit from non-adjacent investments</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-rose-600 mt-1">•</span>
                                    <span>Resource allocation with constraints</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-rose-600 mt-1">•</span>
                                    <span>Activity selection problems</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-rose-600 mt-1">•</span>
                                    <span>Maximum sum with no adjacent elements</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-rose-600 mt-1">•</span>
                                    <span>Stock trading with cooldown periods</span>
                                </li>
                            </ul>
                        </div>

                        {/* Key Concepts */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="font-bold text-gray-900 mb-4">Key DP Concepts</h3>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li className="flex items-start gap-2">
                                    <span className="text-green-600 mt-1">✓</span>
                                    <span><strong>Constraint:</strong> Cannot rob adjacent houses</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-600 mt-1">✓</span>
                                    <span><strong>State:</strong> dp[i] = max money up to house i</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">ℹ</span>
                                    <span><strong>Recurrence:</strong> dp[i] = max(rob, skip)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">ℹ</span>
                                    <span><strong>Base Cases:</strong> dp[0] = nums[0], dp[1] = max(nums[0], nums[1])</span>
                                </li>
                            </ul>
                        </div>

                        {/* Problem Variants */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="font-bold text-gray-900 mb-4">Problem Variants</h3>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>House Robber II (circular array)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>House Robber III (binary tree)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>Maximum sum with k distance apart</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>Delete and earn (similar pattern)</span>
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

export default HouseRobberPage;