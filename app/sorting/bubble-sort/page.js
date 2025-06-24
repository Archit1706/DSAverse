"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Lightbulb, Clock, Code2 } from 'lucide-react';

const BubbleSortPage = () => {
    const [array, setArray] = useState([64, 34, 25, 12, 22, 11, 90]);
    const [originalArray] = useState([64, 34, 25, 12, 22, 11, 90]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(800);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);

    const generateBubbleSortSteps = (arr) => {
        const steps = [];
        const n = arr.length;
        let tempArr = [...arr];

        steps.push({
            array: [...tempArr],
            comparisons: [],
            swaps: [],
            sorted: [],
            explanation: "🎯 Starting Bubble Sort: We'll compare adjacent elements and swap them if they're in the wrong order. The largest elements will 'bubble up' to the end of the array.",
            currentPass: 0,
            totalPasses: n - 1
        });

        for (let i = 0; i < n - 1; i++) {
            steps.push({
                array: [...tempArr],
                comparisons: [],
                swaps: [],
                sorted: Array.from({ length: i }, (_, k) => n - 1 - k),
                explanation: `🔄 Pass ${i + 1} of ${n - 1}: We'll scan through the unsorted portion and find the largest element to place it in its correct position.`,
                currentPass: i + 1,
                totalPasses: n - 1
            });

            for (let j = 0; j < n - i - 1; j++) {
                steps.push({
                    array: [...tempArr],
                    comparisons: [j, j + 1],
                    swaps: [],
                    sorted: Array.from({ length: i }, (_, k) => n - 1 - k),
                    explanation: `🔍 Comparing ${tempArr[j]} and ${tempArr[j + 1]} at positions ${j} and ${j + 1}. ${tempArr[j] > tempArr[j + 1] ? `${tempArr[j]} > ${tempArr[j + 1]}, so we need to swap!` : `${tempArr[j]} ≤ ${tempArr[j + 1]}, no swap needed.`}`,
                    currentPass: i + 1,
                    totalPasses: n - 1
                });

                if (tempArr[j] > tempArr[j + 1]) {
                    [tempArr[j], tempArr[j + 1]] = [tempArr[j + 1], tempArr[j]];
                    steps.push({
                        array: [...tempArr],
                        comparisons: [],
                        swaps: [j, j + 1],
                        sorted: Array.from({ length: i }, (_, k) => n - 1 - k),
                        explanation: `🔄 Swapped! ${tempArr[j]} and ${tempArr[j + 1]} have been exchanged. The larger element moves closer to its final position.`,
                        currentPass: i + 1,
                        totalPasses: n - 1
                    });
                }
            }

            steps.push({
                array: [...tempArr],
                comparisons: [],
                swaps: [],
                sorted: Array.from({ length: i + 1 }, (_, k) => n - 1 - k),
                explanation: `✅ Pass ${i + 1} complete! Element ${tempArr[n - 1 - i]} is now in its correct position at index ${n - 1 - i}.`,
                currentPass: i + 1,
                totalPasses: n - 1
            });
        }

        steps.push({
            array: [...tempArr],
            comparisons: [],
            swaps: [],
            sorted: Array.from({ length: n }, (_, k) => k),
            explanation: "🎉 Bubble Sort Complete! All elements are now sorted in ascending order. The algorithm made " + (n - 1) + " passes through the array.",
            currentPass: n - 1,
            totalPasses: n - 1
        });

        return steps;
    };

    useEffect(() => {
        const steps = generateBubbleSortSteps(array);
        setStepHistory(steps);
        setCurrentStep(0);
    }, [array]);

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

    const generateNewArray = () => {
        const newArray = Array.from({ length: 7 }, () => Math.floor(Math.random() * 90) + 10);
        setArray(newArray);
        setIsPlaying(false);
        setCurrentStep(0);
    };

    const resetToOriginal = () => {
        setArray([...originalArray]);
        setIsPlaying(false);
        setCurrentStep(0);
    };

    const currentState = stepHistory[currentStep] || {
        array: array,
        comparisons: [],
        swaps: [],
        sorted: [],
        explanation: 'Click Start to begin the Bubble Sort visualization',
        currentPass: 0,
        totalPasses: 0
    };

    const getBarColor = (index) => {
        if (currentState.sorted.includes(index)) return 'bg-green-500 border-green-600';
        if (currentState.swaps.includes(index)) return 'bg-red-500 border-red-600 animate-pulse';
        if (currentState.comparisons.includes(index)) return 'bg-yellow-400 border-yellow-500 transform scale-110';
        return 'bg-orange-400 border-orange-500';
    };

    const maxValue = Math.max(...currentState.array);

    const codeExample = `def bubble_sort(arr):
    n = len(arr)
    
    # Traverse through all array elements
    for i in range(n - 1):
        # Flag to optimize - if no swapping occurs, array is sorted
        swapped = False
        
        # Last i elements are already in place
        for j in range(n - i - 1):
            # Traverse the array from 0 to n-i-1
            # Swap if the element found is greater than the next element
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
                swapped = True
        
        # If no swapping occurred, array is sorted
        if not swapped:
            break
    
    return arr`;

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex items-center mb-6">
                        <Link href="/sorting" className="flex items-center text-white hover:text-orange-200 transition-colors mr-4">
                            <ArrowLeft className="h-5 w-5 mr-2" />
                            Back to Sorting
                        </Link>
                    </div>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">
                            Bubble Sort Visualizer
                        </h1>
                        <p className="text-xl text-orange-100 mb-6 max-w-3xl mx-auto">
                            Watch how Bubble Sort compares adjacent elements and gradually moves larger elements to their correct positions.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Time: O(n²)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(1)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Stable: Yes</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">In-place: Yes</div>
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
                                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
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
                                    onClick={generateNewArray}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                                >
                                    Randomize
                                </button>

                                <button
                                    onClick={resetToOriginal}
                                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium"
                                >
                                    Original Array
                                </button>
                            </div>

                            {/* Speed Control */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2 text-gray-700">
                                    Animation Speed: {speed}ms
                                </label>
                                <input
                                    type="range"
                                    min="200"
                                    max="2000"
                                    value={speed}
                                    onChange={(e) => setSpeed(Number(e.target.value))}
                                    className="w-full max-w-md accent-orange-500"
                                />
                                <div className="flex justify-between text-xs text-gray-500 max-w-md mt-1">
                                    <span>Fast (200ms)</span>
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
                                        Pass {currentState.currentPass} of {currentState.totalPasses}
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${((currentStep + 1) / stepHistory.length) * 100}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* Array Visualization */}
                            <div className="mb-6">
                                <div className="flex items-end justify-center gap-2 h-64 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                                    {currentState.array.map((value, index) => (
                                        <div key={index} className="flex flex-col items-center">
                                            <div
                                                className={`w-12 transition-all duration-500 border-2 rounded-t-lg ${getBarColor(index)}`}
                                                style={{
                                                    height: `${(value / maxValue) * 200}px`,
                                                }}
                                            />
                                            <span className="text-sm mt-2 font-medium text-gray-700">{value}</span>
                                            <span className="text-xs text-gray-500">{index}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Legend */}
                                <div className="flex flex-wrap justify-center gap-4 mt-4 text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-orange-400 border border-orange-500 rounded"></div>
                                        <span>Unsorted</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-yellow-400 border border-yellow-500 rounded"></div>
                                        <span>Comparing</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-red-500 border border-red-600 rounded"></div>
                                        <span>Swapping</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-green-500 border border-green-600 rounded"></div>
                                        <span>Sorted</span>
                                    </div>
                                </div>
                            </div>

                            {/* Current Step Explanation */}
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <Lightbulb className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h3 className="font-semibold text-orange-800 mb-2">Current Step:</h3>
                                        <p className="text-orange-700 leading-relaxed">{currentState.explanation}</p>
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
                                <Clock className="h-5 w-5 text-orange-600" />
                                <h3 className="font-bold text-gray-900">Algorithm Details</h3>
                            </div>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-700">Best Case:</span>
                                    <code className="bg-green-100 text-green-800 px-2 py-1 rounded">O(n)</code>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-700">Average Case:</span>
                                    <code className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">O(n²)</code>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-700">Worst Case:</span>
                                    <code className="bg-red-100 text-red-800 px-2 py-1 rounded">O(n²)</code>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-700">Space:</span>
                                    <code className="bg-blue-100 text-blue-800 px-2 py-1 rounded">O(1)</code>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-700">Stable:</span>
                                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded">Yes</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-700">In-place:</span>
                                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded">Yes</span>
                                </div>
                            </div>
                        </div>

                        {/* When to Use */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="font-bold text-gray-900 mb-4">When to Use Bubble Sort</h3>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li className="flex items-start gap-2">
                                    <span className="text-green-600 mt-1">✓</span>
                                    <span>Educational purposes and learning</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-600 mt-1">✓</span>
                                    <span>Very small datasets (&lt; 10 elements)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-600 mt-1">✓</span>
                                    <span>When simplicity is more important than efficiency</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-red-600 mt-1">✗</span>
                                    <span>Large datasets (too slow)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-red-600 mt-1">✗</span>
                                    <span>Production systems requiring performance</span>
                                </li>
                            </ul>
                        </div>

                        {/* Code Toggle */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <button
                                onClick={() => setShowCode(!showCode)}
                                className="flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium"
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

export default BubbleSortPage;