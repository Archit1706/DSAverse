'use client';
import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pause, Play, Square, ChevronLeft, ChevronRight, RotateCcw, Code, Target, Zap } from 'lucide-react';
import { TrendingUp } from 'lucide-react';

const FibonacciSearchPage = () => {
    const [array, setArray] = useState([2, 3, 4, 10, 40, 43, 56, 67, 78, 89, 99]);
    const [originalArray] = useState([2, 3, 4, 10, 40, 43, 56, 67, 78, 89, 99]);
    const [target, setTarget] = useState(10);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(1500);

    const generateSteps = useCallback(() => {
        const steps = [];
        const n = array.length;

        // Generate Fibonacci numbers
        let fibM2 = 0; // (m-2)'th Fibonacci number
        let fibM1 = 1; // (m-1)'th Fibonacci number
        let fibM = fibM2 + fibM1; // m'th Fibonacci number

        while (fibM < n) {
            fibM2 = fibM1;
            fibM1 = fibM;
            fibM = fibM2 + fibM1;
        }

        steps.push({
            array: [...array],
            fibM: fibM,
            fibM1: fibM1,
            fibM2: fibM2,
            offset: -1,
            i: -1,
            found: false,
            foundIndex: -1,
            phase: 'setup',
            explanation: `Setup: Found Fibonacci numbers. fibM=${fibM}, fibM1=${fibM1}, fibM2=${fibM2}`,
            comparisons: 0
        });

        let offset = -1;
        let found = false;
        let foundIndex = -1;
        let comparisons = 0;

        while (fibM > 1) {
            let i = Math.min(offset + fibM2, n - 1);
            comparisons++;

            steps.push({
                array: [...array],
                fibM: fibM,
                fibM1: fibM1,
                fibM2: fibM2,
                offset: offset,
                i: i,
                found: false,
                foundIndex: -1,
                phase: 'searching',
                explanation: `Check array[${i}] = ${array[i]}. Compare with target ${target}.`,
                comparisons: comparisons
            });

            if (array[i] < target) {
                steps.push({
                    array: [...array],
                    fibM: fibM,
                    fibM1: fibM1,
                    fibM2: fibM2,
                    offset: offset,
                    i: i,
                    found: false,
                    foundIndex: -1,
                    phase: 'move_right',
                    explanation: `${array[i]} < ${target}. Move to right subarray. Update Fibonacci numbers.`,
                    comparisons: comparisons
                });

                fibM = fibM1;
                fibM1 = fibM2;
                fibM2 = fibM - fibM1;
                offset = i;
            } else if (array[i] > target) {
                steps.push({
                    array: [...array],
                    fibM: fibM,
                    fibM1: fibM1,
                    fibM2: fibM2,
                    offset: offset,
                    i: i,
                    found: false,
                    foundIndex: -1,
                    phase: 'move_left',
                    explanation: `${array[i]} > ${target}. Move to left subarray. Update Fibonacci numbers.`,
                    comparisons: comparisons
                });

                fibM = fibM2;
                fibM1 = fibM1 - fibM2;
                fibM2 = fibM - fibM1;
            } else {
                found = true;
                foundIndex = i;
                steps.push({
                    array: [...array],
                    fibM: fibM,
                    fibM1: fibM1,
                    fibM2: fibM2,
                    offset: offset,
                    i: i,
                    found: true,
                    foundIndex: foundIndex,
                    phase: 'found',
                    explanation: `🎯 Target ${target} found at index ${i}!`,
                    comparisons: comparisons
                });
                break;
            }
        }

        if (!found) {
            if (fibM1 && offset + 1 < n && array[offset + 1] === target) {
                found = true;
                foundIndex = offset + 1;
                steps.push({
                    array: [...array],
                    fibM: fibM,
                    fibM1: fibM1,
                    fibM2: fibM2,
                    offset: offset,
                    i: offset + 1,
                    found: true,
                    foundIndex: foundIndex,
                    phase: 'found',
                    explanation: `🎯 Target ${target} found at index ${offset + 1}!`,
                    comparisons: comparisons + 1
                });
            } else {
                steps.push({
                    array: [...array],
                    fibM: fibM,
                    fibM1: fibM1,
                    fibM2: fibM2,
                    offset: offset,
                    i: -1,
                    found: false,
                    foundIndex: -1,
                    phase: 'not_found',
                    explanation: `❌ Target ${target} not found in the array.`,
                    comparisons: comparisons
                });
            }
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
        fibM: 0,
        fibM1: 0,
        fibM2: 0,
        offset: -1,
        i: -1,
        found: false,
        foundIndex: -1,
        phase: 'setup',
        explanation: 'Click Start to begin Fibonacci Search visualization',
        comparisons: 0
    };

    const getBarColor = (index) => {
        if (currentState.found && index === currentState.foundIndex) return 'bg-green-500 border-green-600 shadow-green-300';
        if (index === currentState.i) return 'bg-yellow-400 border-yellow-500 shadow-yellow-300 transform scale-110';
        if (index === currentState.offset) return 'bg-blue-400 border-blue-500 shadow-blue-300';
        return 'bg-red-300 border-red-400';
    };

    const codeExample = `def fibonacci_search(arr, target):
    n = len(arr)
    
    # Initialize Fibonacci numbers
    fib_m2 = 0  # (m-2)'th Fibonacci number
    fib_m1 = 1  # (m-1)'th Fibonacci number
    fib_m = fib_m2 + fib_m1  # m'th Fibonacci number
    
    # Find smallest Fibonacci number >= n
    while fib_m < n:
        fib_m2 = fib_m1
        fib_m1 = fib_m
        fib_m = fib_m2 + fib_m1
    
    offset = -1
    
    while fib_m > 1:
        # Calculate index to check
        i = min(offset + fib_m2, n - 1)
        
        if arr[i] < target:
            fib_m = fib_m1
            fib_m1 = fib_m2
            fib_m2 = fib_m - fib_m1
            offset = i
        elif arr[i] > target:
            fib_m = fib_m2
            fib_m1 = fib_m1 - fib_m2
            fib_m2 = fib_m - fib_m1
        else:
            return i
    
    # Check last element
    if fib_m1 and offset + 1 < n and arr[offset + 1] == target:
        return offset + 1
    
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
                            Fibonacci Search Visualizer
                        </h1>
                        <p className="text-xl text-red-100 mb-6 max-w-3xl mx-auto">
                            Watch how Fibonacci Search uses Fibonacci numbers to divide the array and efficiently locate the target element.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Time: O(log n)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(1)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Requirement: Sorted Array</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Fibonacci Division</div>
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
                                        max="100"
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

                            {/* Fibonacci Info */}
                            <div className="mb-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
                                <div className="text-sm text-purple-800">
                                    <span className="font-semibold">Fibonacci Numbers:</span> fibM={currentState.fibM}, fibM1={currentState.fibM1}, fibM2={currentState.fibM2} |
                                    <span className="font-semibold"> Offset:</span> {currentState.offset} |
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
                                    <div className="flex items-end gap-2 overflow-x-auto pb-2">
                                        {currentState.array.map((value, index) => (
                                            <div key={index} className="flex flex-col items-center">
                                                <div className="text-xs mb-1 font-medium">{index}</div>
                                                <div
                                                    className={`w-12 h-16 flex items-center justify-center text-white font-bold rounded-lg border-2 transition-all duration-500 ${getBarColor(index)}`}
                                                >
                                                    {value}
                                                </div>
                                                {index === currentState.i && (
                                                    <div className="text-xs mt-1 text-yellow-600 font-bold">CHECK</div>
                                                )}
                                                {index === currentState.offset && (
                                                    <div className="text-xs mt-1 text-blue-600 font-bold">OFFSET</div>
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
                                Fibonacci Search
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
                                    <span className="text-gray-600">Division:</span>
                                    <span className="font-semibold">Fibonacci</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Operations:</span>
                                    <span className="font-semibold">Addition only</span>
                                </div>
                            </div>
                        </div>

                        {/* Color Legend */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Color Legend</h3>
                            <div className="space-y-2">
                                <div className="flex items-center">
                                    <div className="w-4 h-4 bg-yellow-400 border border-yellow-500 rounded mr-3"></div>
                                    <span className="text-sm">Currently Checking</span>
                                </div>
                                <div className="flex items-center">
                                    <div className="w-4 h-4 bg-blue-400 border border-blue-500 rounded mr-3"></div>
                                    <span className="text-sm">Offset Position</span>
                                </div>
                                <div className="flex items-center">
                                    <div className="w-4 h-4 bg-green-500 border border-green-600 rounded mr-3"></div>
                                    <span className="text-sm">Target Found</span>
                                </div>
                                <div className="flex items-center">
                                    <div className="w-4 h-4 bg-red-300 border border-red-400 rounded mr-3"></div>
                                    <span className="text-sm">Search Space</span>
                                </div>
                            </div>
                        </div>

                        {/* Fibonacci Sequence */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Fibonacci Numbers</h3>
                            <div className="text-sm text-gray-700">
                                <p className="mb-2">The algorithm uses Fibonacci numbers to divide the array:</p>
                                <div className="bg-gray-100 p-2 rounded font-mono text-xs">
                                    0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89...
                                </div>
                                <p className="mt-2 text-xs">Each division follows the golden ratio (φ ≈ 1.618), providing optimal search performance.</p>
                            </div>
                        </div>

                        {/* Algorithm Steps */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">How It Works</h3>
                            <ol className="space-y-2 text-sm text-gray-700">
                                <li className="flex">
                                    <span className="bg-red-100 text-red-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5">1</span>
                                    <span>Find smallest Fibonacci ≥ array length</span>
                                </li>
                                <li className="flex">
                                    <span className="bg-red-100 text-red-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5">2</span>
                                    <span>Check element at offset + fibM2</span>
                                </li>
                                <li className="flex">
                                    <span className="bg-red-100 text-red-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5">3</span>
                                    <span>Eliminate sections using Fibonacci</span>
                                </li>
                                <li className="flex">
                                    <span className="bg-red-100 text-red-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5">4</span>
                                    <span>Continue until target found or exhausted</span>
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
                                <li>• When multiplication/division is expensive</li>
                                <li>• Searching in sorted arrays efficiently</li>
                                <li>• Systems without floating-point arithmetic</li>
                                <li>• Optimal search with addition-only operations</li>
                                <li>• Embedded systems with limited CPU</li>
                                <li>• Mathematical sequence analysis</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FibonacciSearchPage;