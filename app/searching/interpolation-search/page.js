'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Play, Pause, Square, RotateCcw, ArrowLeft, ChevronLeft, ChevronRight, Search, Clock, Code, Target, Zap, TrendingUp } from 'lucide-react';
import Link from 'next/link';

// Interpolation Search Page Component
const InterpolationSearchPage = () => {
    const [array, setArray] = useState([10, 12, 13, 16, 18, 19, 20, 21, 22, 23, 24, 33, 35, 42, 47]);
    const [originalArray] = useState([10, 12, 13, 16, 18, 19, 20, 21, 22, 23, 24, 33, 35, 42, 47]);
    const [target, setTarget] = useState(18);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(1500);

    const generateSteps = useCallback(() => {
        const steps = [];
        let left = 0;
        let right = array.length - 1;
        let found = false;
        let foundIndex = -1;

        steps.push({
            array: [...array],
            left: left,
            right: right,
            pos: -1,
            found: false,
            foundIndex: -1,
            calculation: '',
            explanation: `Starting Interpolation Search for target ${target}. Using linear interpolation to estimate position.`,
            comparisons: 0
        });

        let comparisons = 0;

        while (left <= right && target >= array[left] && target <= array[right] && !found) {
            // If left and right are same
            if (left === right) {
                comparisons++;
                if (array[left] === target) {
                    found = true;
                    foundIndex = left;
                    steps.push({
                        array: [...array],
                        left: left,
                        right: right,
                        pos: left,
                        found: true,
                        foundIndex: foundIndex,
                        calculation: `Single element remaining`,
                        explanation: `🎯 Target ${target} found at index ${left}!`,
                        comparisons: comparisons
                    });
                } else {
                    steps.push({
                        array: [...array],
                        left: left,
                        right: right,
                        pos: left,
                        found: false,
                        foundIndex: -1,
                        calculation: `Single element: ${array[left]} ≠ ${target}`,
                        explanation: `❌ Target ${target} not found.`,
                        comparisons: comparisons
                    });
                }
                break;
            }

            // Interpolation formula: pos = left + [(target - arr[left]) * (right - left)] / (arr[right] - arr[left])
            const pos = left + Math.floor(((target - array[left]) * (right - left)) / (array[right] - array[left]));

            const calculation = `pos = ${left} + [(${target} - ${array[left]}) × (${right} - ${left})] / (${array[right]} - ${array[left]}) = ${pos}`;

            steps.push({
                array: [...array],
                left: left,
                right: right,
                pos: pos,
                found: false,
                foundIndex: -1,
                calculation: calculation,
                explanation: `Interpolated position: ${pos}. Checking array[${pos}] = ${array[pos]}`,
                comparisons: comparisons
            });

            comparisons++;
            if (array[pos] === target) {
                found = true;
                foundIndex = pos;
                steps.push({
                    array: [...array],
                    left: left,
                    right: right,
                    pos: pos,
                    found: true,
                    foundIndex: foundIndex,
                    calculation: calculation,
                    explanation: `🎯 Target ${target} found at index ${pos}!`,
                    comparisons: comparisons
                });
                break;
            }

            if (array[pos] < target) {
                steps.push({
                    array: [...array],
                    left: left,
                    right: right,
                    pos: pos,
                    found: false,
                    foundIndex: -1,
                    calculation: calculation,
                    explanation: `${array[pos]} < ${target}. Search right side: [${pos + 1}, ${right}]`,
                    comparisons: comparisons
                });
                left = pos + 1;
            } else {
                steps.push({
                    array: [...array],
                    left: left,
                    right: right,
                    pos: pos,
                    found: false,
                    foundIndex: -1,
                    calculation: calculation,
                    explanation: `${array[pos]} > ${target}. Search left side: [${left}, ${pos - 1}]`,
                    comparisons: comparisons
                });
                right = pos - 1;
            }
        }

        if (!found) {
            steps.push({
                array: [...array],
                left: left,
                right: right,
                pos: -1,
                found: false,
                foundIndex: -1,
                calculation: '',
                explanation: `❌ Target ${target} not found or out of range.`,
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
        left: 0,
        right: array.length - 1,
        pos: -1,
        found: false,
        foundIndex: -1,
        calculation: '',
        explanation: 'Click Start to begin Interpolation Search visualization',
        comparisons: 0
    };

    const getBarColor = (index) => {
        if (currentState.found && index === currentState.foundIndex) return 'bg-green-500 border-green-600 shadow-green-300';
        if (index === currentState.pos) return 'bg-yellow-400 border-yellow-500 shadow-yellow-300 transform scale-110';
        if (index < currentState.left || index > currentState.right) return 'bg-gray-400 border-gray-500 opacity-50';
        if (index === currentState.left || index === currentState.right) return 'bg-red-400 border-red-500 shadow-red-300';
        return 'bg-red-300 border-red-400';
    };

    const codeExample = `def interpolation_search(arr, target):
    left, right = 0, len(arr) - 1
    
    while (left <= right and target >= arr[left] and target <= arr[right]):
        # If we have a single element
        if left == right:
            if arr[left] == target:
                return left
            else:
                return -1
        
        # Interpolation formula
        pos = left + int(((target - arr[left]) * (right - left)) / (arr[right] - arr[left]))
        
        if arr[pos] == target:
            return pos
        elif arr[pos] < target:
            left = pos + 1
        else:
            right = pos - 1
    
    return -1`;

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex items-center mb-6">
                        <Link href="/searching" className="flex items-center text-white hover:text-red-200 transition-colors mr-4">
                            <ArrowLeft className="h-5 w-5 mr-2" />
                            Back to Searching
                        </Link>
                    </div>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">
                            Interpolation Search Visualizer
                        </h1>
                        <p className="text-xl text-red-100 mb-6 max-w-3xl mx-auto">
                            Watch how Interpolation Search estimates the position using linear interpolation, ideal for uniformly distributed data.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Time: O(log log n)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(1)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Requirement: Sorted & Uniform</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Linear Interpolation</div>
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

                            {/* Interpolation Formula */}
                            {currentState.calculation && (
                                <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <h4 className="font-semibold text-blue-800 mb-2">Interpolation Calculation:</h4>
                                    <div className="text-sm text-blue-700 font-mono bg-blue-100 p-2 rounded">
                                        {currentState.calculation}
                                    </div>
                                </div>
                            )}

                            {/* Algorithm Info */}
                            <div className="mb-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
                                <div className="text-sm text-purple-800">
                                    <span className="font-semibold">Search Range:</span> [{currentState.left}, {currentState.right}] |
                                    {currentState.pos >= 0 && (
                                        <span> <span className="font-semibold">Interpolated Position:</span> {currentState.pos} |</span>
                                    )}
                                    <span className="font-semibold"> Comparisons:</span> {currentState.comparisons}
                                </div>
                            </div>

                            {/* Speed Control */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Animation Speed: {speed === 1000 ? 'Fast' : speed === 1500 ? 'Normal' : 'Slow'}
                                </label>
                                <input
                                    type="range"
                                    min="1000"
                                    max="2500"
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
                                                {index === currentState.left && (
                                                    <div className="text-xs mt-1 text-red-600 font-bold">L</div>
                                                )}
                                                {index === currentState.right && (
                                                    <div className="text-xs mt-1 text-red-600 font-bold">R</div>
                                                )}
                                                {index === currentState.pos && (
                                                    <div className="text-xs mt-1 text-yellow-600 font-bold">POS</div>
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
                                Interpolation Search
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Time Complexity:</span>
                                    <span className="font-semibold">O(log log n)</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Space Complexity:</span>
                                    <span className="font-semibold">O(1)</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Worst Case:</span>
                                    <span className="font-semibold">O(n)</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Best For:</span>
                                    <span className="font-semibold">Uniform Data</span>
                                </div>
                            </div>
                        </div>

                        {/* Color Legend */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Color Legend</h3>
                            <div className="space-y-2">
                                <div className="flex items-center">
                                    <div className="w-4 h-4 bg-yellow-400 border border-yellow-500 rounded mr-3"></div>
                                    <span className="text-sm">Interpolated Position</span>
                                </div>
                                <div className="flex items-center">
                                    <div className="w-4 h-4 bg-red-400 border border-red-500 rounded mr-3"></div>
                                    <span className="text-sm">Search Boundaries (L, R)</span>
                                </div>
                                <div className="flex items-center">
                                    <div className="w-4 h-4 bg-green-500 border border-green-600 rounded mr-3"></div>
                                    <span className="text-sm">Target Found</span>
                                </div>
                                <div className="flex items-center">
                                    <div className="w-4 h-4 bg-red-300 border border-red-400 rounded mr-3"></div>
                                    <span className="text-sm">Active Search Space</span>
                                </div>
                                <div className="flex items-center">
                                    <div className="w-4 h-4 bg-gray-400 border border-gray-500 rounded mr-3 opacity-50"></div>
                                    <span className="text-sm">Eliminated Space</span>
                                </div>
                            </div>
                        </div>

                        {/* Formula Explanation */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Interpolation Formula</h3>
                            <div className="text-sm text-gray-700">
                                <div className="bg-gray-100 p-3 rounded font-mono text-xs mb-3">
                                    pos = left + [(target - arr[left]) × (right - left)] / (arr[right] - arr[left])
                                </div>
                                <p className="mb-2">This formula estimates where the target should be based on its value relative to the range.</p>
                                <p className="text-xs text-gray-600">Works best when data is uniformly distributed.</p>
                            </div>
                        </div>

                        {/* Algorithm Steps */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">How It Works</h3>
                            <ol className="space-y-2 text-sm text-gray-700">
                                <li className="flex">
                                    <span className="bg-red-100 text-red-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5">1</span>
                                    <span>Calculate interpolated position</span>
                                </li>
                                <li className="flex">
                                    <span className="bg-red-100 text-red-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5">2</span>
                                    <span>Check element at calculated position</span>
                                </li>
                                <li className="flex">
                                    <span className="bg-red-100 text-red-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5">3</span>
                                    <span>Adjust search range based on comparison</span>
                                </li>
                                <li className="flex">
                                    <span className="bg-red-100 text-red-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5">4</span>
                                    <span>Repeat until found or exhausted</span>
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
                                <li>• Searching in phone directories</li>
                                <li>• Database indexing for numeric ranges</li>
                                <li>• Time-series data analysis</li>
                                <li>• Geographic coordinate searching</li>
                                <li>• Uniformly distributed scientific data</li>
                                <li>• Dictionary/glossary lookups</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InterpolationSearchPage;