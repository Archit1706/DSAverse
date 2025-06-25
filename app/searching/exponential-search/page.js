'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Play, Pause, Square, RotateCcw, ArrowLeft, ChevronLeft, ChevronRight, Search, Clock, Code, Target, Zap, TrendingUp } from 'lucide-react';
import Link from 'next/link';

const ExponentialSearchPage = () => {
    const [array, setArray] = useState([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30]);
    const [originalArray] = useState([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30]);
    const [target, setTarget] = useState(18);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(1000);

    const generateSteps = useCallback(() => {
        const steps = [];
        let bound = 1;
        let found = false;
        let foundIndex = -1;

        steps.push({
            array: [...array],
            bound: bound,
            left: -1,
            right: -1,
            mid: -1,
            found: false,
            foundIndex: -1,
            phase: 'exponential',
            currentIndex: 0,
            explanation: `Starting Exponential Search for target ${target}. Begin with bound = 1.`,
            comparisons: 0
        });

        let comparisons = 0;

        // Exponential phase - find the range
        while (bound < array.length && array[bound] < target) {
            comparisons++;
            steps.push({
                array: [...array],
                bound: bound,
                left: -1,
                right: -1,
                mid: -1,
                found: false,
                foundIndex: -1,
                phase: 'exponential',
                currentIndex: bound,
                explanation: `Check array[${bound}] = ${array[bound]}. ${array[bound]} < ${target}, double the bound.`,
                comparisons: comparisons
            });
            bound *= 2;
        }

        comparisons++;
        let left = Math.floor(bound / 2);
        let right = Math.min(bound, array.length - 1);

        steps.push({
            array: [...array],
            bound: bound,
            left: left,
            right: right,
            mid: -1,
            found: false,
            foundIndex: -1,
            phase: 'found_range',
            currentIndex: right,
            explanation: `Found range! array[${right}] = ${array[right]} >= ${target}. Binary search in range [${left}, ${right}].`,
            comparisons: comparisons
        });

        // Binary search phase
        while (left <= right && !found) {
            const mid = Math.floor((left + right) / 2);
            comparisons++;

            steps.push({
                array: [...array],
                bound: bound,
                left: left,
                right: right,
                mid: mid,
                found: false,
                foundIndex: -1,
                phase: 'binary_search',
                currentIndex: mid,
                explanation: `Binary search: Check middle element array[${mid}] = ${array[mid]}`,
                comparisons: comparisons
            });

            if (array[mid] === target) {
                found = true;
                foundIndex = mid;
                steps.push({
                    array: [...array],
                    bound: bound,
                    left: left,
                    right: right,
                    mid: mid,
                    found: true,
                    foundIndex: foundIndex,
                    phase: 'found',
                    currentIndex: mid,
                    explanation: `🎯 Target ${target} found at index ${mid}!`,
                    comparisons: comparisons
                });
            } else if (array[mid] < target) {
                steps.push({
                    array: [...array],
                    bound: bound,
                    left: left,
                    right: right,
                    mid: mid,
                    found: false,
                    foundIndex: -1,
                    phase: 'binary_search',
                    currentIndex: mid,
                    explanation: `${array[mid]} < ${target}. Search right half.`,
                    comparisons: comparisons
                });
                left = mid + 1;
            } else {
                steps.push({
                    array: [...array],
                    bound: bound,
                    left: left,
                    right: right,
                    mid: mid,
                    found: false,
                    foundIndex: -1,
                    phase: 'binary_search',
                    currentIndex: mid,
                    explanation: `${array[mid]} > ${target}. Search left half.`,
                    comparisons: comparisons
                });
                right = mid - 1;
            }
        }

        if (!found) {
            steps.push({
                array: [...array],
                bound: bound,
                left: left,
                right: right,
                mid: -1,
                found: false,
                foundIndex: -1,
                phase: 'not_found',
                currentIndex: -1,
                explanation: `❌ Target ${target} not found in the array.`,
                comparisons: comparisons
            });
        }

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
        bound: 1,
        left: -1,
        right: -1,
        mid: -1,
        found: false,
        foundIndex: -1,
        phase: 'exponential',
        currentIndex: 0,
        explanation: 'Click Start to begin Exponential Search visualization',
        comparisons: 0
    };

    const getBarColor = (index) => {
        if (currentState.found && index === currentState.foundIndex) return 'bg-green-500 border-green-600 shadow-green-300';
        if (index === currentState.currentIndex) return 'bg-yellow-400 border-yellow-500 shadow-yellow-300 transform scale-110';
        if (currentState.phase === 'binary_search' && index >= currentState.left && index <= currentState.right) {
            return 'bg-red-300 border-red-400';
        }
        if (currentState.phase === 'exponential' && index < currentState.bound) {
            return 'bg-blue-300 border-blue-400';
        }
        return 'bg-gray-300 border-gray-400';
    };

    const codeExample = `def exponential_search(arr, target):
    # If target is at first position
    if arr[0] == target:
        return 0
    
    # Find range for binary search
    bound = 1
    while bound < len(arr) and arr[bound] < target:
        bound *= 2
    
    # Binary search in found range
    left = bound // 2
    right = min(bound, len(arr) - 1)
    
    return binary_search(arr, target, left, right)

def binary_search(arr, target, left, right):
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1`;

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-800 to-rose-800 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex items-center mb-6">
                        <Link href="/searching" className="flex items-center text-white hover:text-red-200 transition-colors mr-4">
                            <ArrowLeft className="h-5 w-5 mr-2" />
                            Back to Searching
                        </Link>
                    </div>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">
                            Exponential Search Visualizer
                        </h1>
                        <p className="text-xl text-red-100 mb-6 max-w-3xl mx-auto">
                            Watch how Exponential Search finds the range exponentially, then performs binary search within that range.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Time: O(log n)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(1)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Requirement: Sorted Array</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Exponential + Binary</div>
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
                                    <span className="font-semibold">Current Bound:</span> {currentState.bound} |
                                    <span className="font-semibold"> Phase:</span> {currentState.phase.replace('_', ' ').toUpperCase()} |
                                    <span className="font-semibold"> Comparisons:</span> {currentState.comparisons}
                                    {currentState.left >= 0 && currentState.right >= 0 && (
                                        <span> | <span className="font-semibold">Search Range:</span> [{currentState.left}, {currentState.right}]</span>
                                    )}
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
                                                    className={`w-8 h-12 flex items-center justify-center text-white font-bold rounded-lg border-2 transition-all duration-500 ${getBarColor(index)}`}
                                                >
                                                    {value}
                                                </div>
                                                {index === currentState.currentIndex && (
                                                    <div className="text-xs mt-1 text-yellow-600 font-bold">👆</div>
                                                )}
                                                {index === currentState.left && (
                                                    <div className="text-xs mt-1 text-red-600 font-bold">L</div>
                                                )}
                                                {index === currentState.right && (
                                                    <div className="text-xs mt-1 text-red-600 font-bold">R</div>
                                                )}
                                                {index === currentState.mid && (
                                                    <div className="text-xs mt-1 text-yellow-600 font-bold">MID</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

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
                                <TrendingUp className="h-5 w-5 mr-2 text-red-500" />
                                Exponential Search
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Time Complexity:</span>
                                    <span className="font-semibold">O(log n)</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Space Complexity:</span>
                                    <span className="font-semibold">O(1)</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Best For:</span>
                                    <span className="font-semibold">Unbounded Arrays</span>
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
                                    <div className="w-4 h-4 bg-blue-300 border border-blue-400 rounded mr-3"></div>
                                    <span className="text-sm">Exponential Phase Range</span>
                                </div>
                                <div className="flex items-center">
                                    <div className="w-4 h-4 bg-yellow-400 border border-yellow-500 rounded mr-3"></div>
                                    <span className="text-sm">Currently Checking</span>
                                </div>
                                <div className="flex items-center">
                                    <div className="w-4 h-4 bg-red-300 border border-red-400 rounded mr-3"></div>
                                    <span className="text-sm">Binary Search Range</span>
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
                                    <span>Start with bound = 1</span>
                                </li>
                                <li className="flex">
                                    <span className="bg-red-100 text-red-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5">2</span>
                                    <span>Double bound until element ≥ target</span>
                                </li>
                                <li className="flex">
                                    <span className="bg-red-100 text-red-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5">3</span>
                                    <span>Set range [bound/2, bound]</span>
                                </li>
                                <li className="flex">
                                    <span className="bg-red-100 text-red-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5">4</span>
                                    <span>Perform binary search in range</span>
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
                                <li>• Searching in unbounded/infinite arrays</li>
                                <li>• When array size is unknown</li>
                                <li>• Searching in very large sorted datasets</li>
                                <li>• Finding elements near the beginning</li>
                                <li>• Memory-mapped file searching</li>
                                <li>• Network packet searching</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExponentialSearchPage;