'use client';
import React, { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pause, Play, Square, ChevronLeft, ChevronRight, RotateCcw, Code, Target, Zap } from 'lucide-react';

const JumpSearchPage = () => {
    const [array, setArray] = useState([1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29]);
    const [originalArray] = useState([1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29]);
    const [target, setTarget] = useState(15);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(1000);

    const generateSteps = useCallback(() => {
        const steps = [];
        const n = array.length;
        const jumpSize = Math.floor(Math.sqrt(n));
        let step = jumpSize;
        let prev = 0;
        let found = false;
        let foundIndex = -1;

        steps.push({
            array: [...array],
            jumpSize: jumpSize,
            currentIndex: -1,
            blockStart: 0,
            blockEnd: -1,
            found: false,
            foundIndex: -1,
            phase: 'jumping',
            jumpIndices: [],
            searchIndices: [],
            explanation: `Starting Jump Search for target ${target}. Jump size = √${n} = ${jumpSize}`,
            comparisons: 0
        });

        let comparisons = 0;

        // Jumping phase
        while (array[Math.min(step, n) - 1] < target) {
            comparisons++;
            steps.push({
                array: [...array],
                jumpSize: jumpSize,
                currentIndex: Math.min(step, n) - 1,
                blockStart: prev,
                blockEnd: Math.min(step, n) - 1,
                found: false,
                foundIndex: -1,
                phase: 'jumping',
                jumpIndices: [Math.min(step, n) - 1],
                searchIndices: [],
                explanation: `Jumping: Check array[${Math.min(step, n) - 1}] = ${array[Math.min(step, n) - 1]}. ${array[Math.min(step, n) - 1]} < ${target}, continue jumping.`,
                comparisons: comparisons
            });

            prev = step;
            step += jumpSize;

            if (prev >= n) {
                steps.push({
                    array: [...array],
                    jumpSize: jumpSize,
                    currentIndex: -1,
                    blockStart: prev,
                    blockEnd: -1,
                    found: false,
                    foundIndex: -1,
                    phase: 'finished',
                    jumpIndices: [],
                    searchIndices: [],
                    explanation: `❌ Target ${target} not found. Jumped past array bounds.`,
                    comparisons: comparisons
                });
                return steps;
            }
        }

        comparisons++;
        steps.push({
            array: [...array],
            jumpSize: jumpSize,
            currentIndex: Math.min(step, n) - 1,
            blockStart: prev,
            blockEnd: Math.min(step, n) - 1,
            found: false,
            foundIndex: -1,
            phase: 'found_block',
            jumpIndices: [Math.min(step, n) - 1],
            searchIndices: [],
            explanation: `Found potential block! array[${Math.min(step, n) - 1}] = ${array[Math.min(step, n) - 1]} >= ${target}. Linear search from index ${prev}.`,
            comparisons: comparisons
        });

        // Linear search phase
        for (let i = prev; i < Math.min(step, n); i++) {
            comparisons++;
            steps.push({
                array: [...array],
                jumpSize: jumpSize,
                currentIndex: i,
                blockStart: prev,
                blockEnd: Math.min(step, n) - 1,
                found: false,
                foundIndex: -1,
                phase: 'linear_search',
                jumpIndices: [],
                searchIndices: [i],
                explanation: `Linear search: Check array[${i}] = ${array[i]} ${array[i] === target ? '==' : '!='} ${target}`,
                comparisons: comparisons
            });

            if (array[i] === target) {
                found = true;
                foundIndex = i;
                steps.push({
                    array: [...array],
                    jumpSize: jumpSize,
                    currentIndex: i,
                    blockStart: prev,
                    blockEnd: Math.min(step, n) - 1,
                    found: true,
                    foundIndex: foundIndex,
                    phase: 'found',
                    jumpIndices: [],
                    searchIndices: [i],
                    explanation: `🎯 Target ${target} found at index ${i}!`,
                    comparisons: comparisons
                });
                return steps;
            }

            if (array[i] > target) {
                steps.push({
                    array: [...array],
                    jumpSize: jumpSize,
                    currentIndex: i,
                    blockStart: prev,
                    blockEnd: Math.min(step, n) - 1,
                    found: false,
                    foundIndex: -1,
                    phase: 'not_found',
                    jumpIndices: [],
                    searchIndices: [i],
                    explanation: `❌ array[${i}] = ${array[i]} > ${target}. Target not in array.`,
                    comparisons: comparisons
                });
                return steps;
            }
        }

        steps.push({
            array: [...array],
            jumpSize: jumpSize,
            currentIndex: -1,
            blockStart: prev,
            blockEnd: Math.min(step, n) - 1,
            found: false,
            foundIndex: -1,
            phase: 'not_found',
            jumpIndices: [],
            searchIndices: [],
            explanation: `❌ Target ${target} not found in the identified block.`,
            comparisons: comparisons
        });

        return steps;
    }, [array, target]);

    useEffect(() => {
        const steps = generateSteps();
        setStepHistory(steps);
        setCurrentStep(0);
    }, [generateSteps]);

    useEffect(() => {
        let interval;
        if (isPlaying && currentStep < stepHistory.length - 1) {
            interval = setInterval(() => {
                setCurrentStep(prev => Math.min(prev + 1, stepHistory.length - 1));
            }, speed);
        } else if (currentStep >= stepHistory.length - 1) {
            setIsPlaying(false);
        }
        return () => clearInterval(interval);
    }, [isPlaying, currentStep, stepHistory.length, speed]);

    const handlePlay = () => {
        if (currentStep >= stepHistory.length - 1) {
            setCurrentStep(0);
        }
        setIsPlaying(true);
    };

    const handlePause = () => setIsPlaying(false);
    const handleStop = () => {
        setIsPlaying(false);
        setCurrentStep(0);
    };

    const handleNext = () => {
        if (currentStep < stepHistory.length - 1) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handlePrevious = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const resetArray = () => {
        setArray([...originalArray]);
        setIsPlaying(false);
        setCurrentStep(0);
    };

    const currentState = stepHistory[currentStep] || {
        array: array,
        jumpSize: Math.floor(Math.sqrt(array.length)),
        currentIndex: -1,
        blockStart: 0,
        blockEnd: -1,
        found: false,
        foundIndex: -1,
        phase: 'jumping',
        jumpIndices: [],
        searchIndices: [],
        explanation: 'Click Start to begin Jump Search visualization',
        comparisons: 0
    };

    const getBarColor = (index) => {
        if (currentState.found && index === currentState.foundIndex) return 'bg-green-500 border-green-600 shadow-green-300';
        if (currentState.jumpIndices.includes(index)) return 'bg-blue-400 border-blue-500 shadow-blue-300 transform scale-110';
        if (currentState.searchIndices.includes(index)) return 'bg-yellow-400 border-yellow-500 shadow-yellow-300 transform scale-110';
        if (index >= currentState.blockStart && index <= currentState.blockEnd && currentState.phase !== 'jumping') {
            return 'bg-red-300 border-red-400';
        }
        return 'bg-gray-300 border-gray-400';
    };

    const codeExample = `import math

def jump_search(arr, target):
    n = len(arr)
    step = int(math.sqrt(n))
    prev = 0
    
    # Jumping phase
    while arr[min(step, n) - 1] < target:
        prev = step
        step += int(math.sqrt(n))
        if prev >= n:
            return -1
    
    # Linear search phase
    while arr[prev] < target:
        prev += 1
        if prev == min(step, n):
            return -1
    
    if arr[prev] == target:
        return prev
    
    return -1`;

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-700 to-rose-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex items-center mb-6">
                        <Link href="/searching" className="flex items-center text-white hover:text-red-200 transition-colors mr-4">
                            <ArrowLeft className="h-5 w-5 mr-2" />
                            Back to Searching
                        </Link>
                    </div>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">
                            Jump Search Visualizer
                        </h1>
                        <p className="text-xl text-red-100 mb-6 max-w-3xl mx-auto">
                            Watch how Jump Search combines the efficiency of jumping with linear search to find elements in sorted arrays.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Time: O(√n)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(1)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Requirement: Sorted Array</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Jump + Linear</div>
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
                                    onClick={isPlaying ? handlePause : handlePlay}
                                    className="flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                >
                                    {isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                                    {isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button
                                    onClick={handleStop}
                                    className="flex items-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                                >
                                    <Square className="h-4 w-4 mr-2" />
                                    Stop
                                </button>
                                <button
                                    onClick={handlePrevious}
                                    disabled={currentStep === 0}
                                    className="flex items-center px-4 py-2 bg-red-400 text-white rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft className="h-4 w-4 mr-2" />
                                    Previous
                                </button>
                                <button
                                    onClick={handleNext}
                                    disabled={currentStep >= stepHistory.length - 1}
                                    className="flex items-center px-4 py-2 bg-red-400 text-white rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4 ml-2" />
                                </button>
                                <button
                                    onClick={resetArray}
                                    className="flex items-center px-4 py-2 bg-red-300 text-white rounded-lg hover:bg-red-400 transition-colors"
                                >
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    Reset
                                </button>
                            </div>

                            {/* Target Input */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Target Value: {target}
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        value={target}
                                        onChange={(e) => setTarget(parseInt(e.target.value) || 0)}
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                        min="0"
                                        max="50"
                                    />
                                    <select
                                        value={target}
                                        onChange={(e) => setTarget(parseInt(e.target.value))}
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                    >
                                        {array.map(val => (
                                            <option key={val} value={val}>{val}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Algorithm Info */}
                            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="text-sm text-blue-800">
                                    <span className="font-semibold">Jump Size:</span> √{array.length} = {currentState.jumpSize} |
                                    <span className="font-semibold"> Phase:</span> {currentState.phase.replace('_', ' ').toUpperCase()} |
                                    <span className="font-semibold"> Comparisons:</span> {currentState.comparisons}
                                </div>
                            </div>

                            {/* Speed Control */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Animation Speed: {speed === 500 ? 'Fast' : speed === 1000 ? 'Normal' : 'Slow'}
                                </label>
                                <input
                                    type="range"
                                    min="500"
                                    max="2000"
                                    step="500"
                                    value={speed}
                                    onChange={(e) => setSpeed(parseInt(e.target.value))}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                                />
                            </div>

                            {/* Array Visualization */}
                            <div className="bg-gray-50 rounded-lg p-6 mb-6">
                                <div className="flex items-center justify-center mb-4">
                                    <div className="flex items-end gap-1 overflow-x-auto pb-2">
                                        {currentState.array.map((value, index) => (
                                            <div key={index} className="flex flex-col items-center">
                                                <div className="text-xs mb-1 font-medium">{index}</div>
                                                <div
                                                    className={`w-10 h-12 flex items-center justify-center text-white font-bold rounded-lg border-2 transition-all duration-500 ${getBarColor(index)}`}
                                                >
                                                    {value}
                                                </div>
                                                {currentState.jumpIndices.includes(index) && (
                                                    <div className="text-xs mt-1 text-blue-600 font-bold">JUMP</div>
                                                )}
                                                {currentState.searchIndices.includes(index) && (
                                                    <div className="text-xs mt-1 text-yellow-600 font-bold">CHECK</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Block Indicator */}
                                {currentState.blockStart >= 0 && currentState.blockEnd >= 0 && currentState.phase !== 'jumping' && (
                                    <div className="text-center mt-2">
                                        <div className="text-sm text-red-600 font-semibold">
                                            Search Block: [{currentState.blockStart} - {currentState.blockEnd}]
                                        </div>
                                    </div>
                                )}

                                {/* Search Info */}
                                <div className="text-center mt-4">
                                    <div className="text-sm text-gray-600">
                                        <span className="font-semibold">Target:</span> {target} |
                                        <span className="font-semibold"> Step:</span> {currentStep + 1} of {stepHistory.length}
                                    </div>
                                </div>
                            </div>

                            {/* Step Explanation */}
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <h3 className="font-semibold text-red-800 mb-2">Current Step:</h3>
                                <p className="text-red-700">{currentState.explanation}</p>
                            </div>
                        </div>
                    </div>

                    {/* Side Panel */}
                    <div className="space-y-6">
                        {/* Algorithm Info */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                                <Zap className="h-5 w-5 mr-2 text-red-500" />
                                Jump Search
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Time Complexity:</span>
                                    <span className="font-semibold">O(√n)</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Space Complexity:</span>
                                    <span className="font-semibold">O(1)</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Jump Size:</span>
                                    <span className="font-semibold">√n</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Type:</span>
                                    <span className="font-semibold">Hybrid</span>
                                </div>
                            </div>
                        </div>

                        {/* Color Legend */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Color Legend</h3>
                            <div className="space-y-2">
                                <div className="flex items-center">
                                    <div className="w-4 h-4 bg-blue-400 border border-blue-500 rounded mr-3"></div>
                                    <span className="text-sm">Jumping Phase</span>
                                </div>
                                <div className="flex items-center">
                                    <div className="w-4 h-4 bg-yellow-400 border border-yellow-500 rounded mr-3"></div>
                                    <span className="text-sm">Linear Search Phase</span>
                                </div>
                                <div className="flex items-center">
                                    <div className="w-4 h-4 bg-red-300 border border-red-400 rounded mr-3"></div>
                                    <span className="text-sm">Search Block</span>
                                </div>
                                <div className="flex items-center">
                                    <div className="w-4 h-4 bg-green-500 border border-green-600 rounded mr-3"></div>
                                    <span className="text-sm">Target Found</span>
                                </div>
                                <div className="flex items-center">
                                    <div className="w-4 h-4 bg-gray-300 border border-gray-400 rounded mr-3"></div>
                                    <span className="text-sm">Not in Search Range</span>
                                </div>
                            </div>
                        </div>

                        {/* Algorithm Steps */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">How It Works</h3>
                            <ol className="space-y-2 text-sm text-gray-700">
                                <li className="flex">
                                    <span className="bg-red-100 text-red-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5">1</span>
                                    <span>Calculate jump size as √n</span>
                                </li>
                                <li className="flex">
                                    <span className="bg-red-100 text-red-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5">2</span>
                                    <span>Jump by step size until element ≥ target</span>
                                </li>
                                <li className="flex">
                                    <span className="bg-red-100 text-red-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5">3</span>
                                    <span>Perform linear search in identified block</span>
                                </li>
                                <li className="flex">
                                    <span className="bg-red-100 text-red-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5">4</span>
                                    <span>Return index if found, -1 otherwise</span>
                                </li>
                            </ol>
                        </div>

                        {/* Code Example */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                                <Code className="h-5 w-5 mr-2 text-red-500" />
                                Python Implementation
                            </h3>
                            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto">
                                {codeExample}
                            </pre>
                        </div>

                        {/* Real-world Applications */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                                <Target className="h-5 w-5 mr-2 text-red-500" />
                                Real-world Applications
                            </h3>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li>• Searching large sorted datasets</li>
                                <li>• When binary search overhead is too high</li>
                                <li>• Searching in systems with sequential access</li>
                                <li>• Optimal for arrays where jumping is efficient</li>
                                <li>• Database indexing with block-based storage</li>
                                <li>• Finding data in sorted file systems</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


export default JumpSearchPage;