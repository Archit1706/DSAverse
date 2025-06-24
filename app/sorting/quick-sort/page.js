"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Lightbulb, Clock, Code2 } from 'lucide-react';

const QuickSortPage = () => {
    const [array, setArray] = useState([64, 34, 25, 12, 22, 11, 90]);
    const [originalArray] = useState([64, 34, 25, 12, 22, 11, 90]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1000);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);

    const generateQuickSortSteps = (arr) => {
        const steps = [];
        const n = arr.length;
        let tempArr = [...arr];

        steps.push({
            array: [...tempArr],
            pivot: -1,
            partitionStart: -1,
            partitionEnd: -1,
            i: -1,
            j: -1,
            comparing: [],
            swapping: [],
            sorted: [],
            leftPartition: [],
            rightPartition: [],
            phase: 'start',
            explanation: "🎯 Starting Quick Sort: We'll use divide-and-conquer by selecting a pivot and partitioning the array around it.",
            level: 0,
            callStack: [`quickSort(0, ${n - 1})`]
        });

        // Helper function for partitioning
        function partition(arr, low, high, level, steps, callStack) {
            const pivot = arr[high];
            let i = low - 1;

            steps.push({
                array: [...tempArr],
                pivot: high,
                partitionStart: low,
                partitionEnd: high,
                i: i,
                j: low,
                comparing: [],
                swapping: [],
                sorted: [],
                leftPartition: [],
                rightPartition: [],
                phase: 'pivot_selected',
                explanation: `🎯 Selected pivot: ${pivot} at position ${high}. Now partitioning array from ${low} to ${high}.`,
                level: level,
                callStack: [...callStack]
            });

            for (let j = low; j < high; j++) {
                steps.push({
                    array: [...tempArr],
                    pivot: high,
                    partitionStart: low,
                    partitionEnd: high,
                    i: i,
                    j: j,
                    comparing: [j],
                    swapping: [],
                    sorted: [],
                    leftPartition: Array.from({ length: Math.max(0, i - low + 1) }, (_, idx) => low + idx),
                    rightPartition: Array.from({ length: j - Math.max(low, i + 1) }, (_, idx) => Math.max(low, i + 1) + idx),
                    phase: 'comparing',
                    explanation: `🔍 Comparing ${arr[j]} at position ${j} with pivot ${pivot}. ${arr[j] <= pivot ? `${arr[j]} ≤ ${pivot}, so it goes to left partition.` : `${arr[j]} > ${pivot}, so it stays in right partition.`}`,
                    level: level,
                    callStack: [...callStack]
                });

                if (arr[j] <= pivot) {
                    i++;
                    if (i !== j) {
                        steps.push({
                            array: [...tempArr],
                            pivot: high,
                            partitionStart: low,
                            partitionEnd: high,
                            i: i,
                            j: j,
                            comparing: [],
                            swapping: [i, j],
                            sorted: [],
                            leftPartition: Array.from({ length: i - low }, (_, idx) => low + idx),
                            rightPartition: Array.from({ length: j - i }, (_, idx) => i + 1 + idx),
                            phase: 'swapping',
                            explanation: `🔄 Swapping ${arr[i]} and ${arr[j]} to move ${arr[j]} to the left partition.`,
                            level: level,
                            callStack: [...callStack]
                        });

                        [arr[i], arr[j]] = [arr[j], arr[i]];
                        tempArr = [...arr];

                        steps.push({
                            array: [...tempArr],
                            pivot: high,
                            partitionStart: low,
                            partitionEnd: high,
                            i: i,
                            j: j,
                            comparing: [],
                            swapping: [],
                            sorted: [],
                            leftPartition: Array.from({ length: i - low + 1 }, (_, idx) => low + idx),
                            rightPartition: Array.from({ length: j - i }, (_, idx) => i + 1 + idx),
                            phase: 'swapped',
                            explanation: `✅ Swapped! ${arr[i]} is now in the left partition.`,
                            level: level,
                            callStack: [...callStack]
                        });
                    } else {
                        steps.push({
                            array: [...tempArr],
                            pivot: high,
                            partitionStart: low,
                            partitionEnd: high,
                            i: i,
                            j: j,
                            comparing: [],
                            swapping: [],
                            sorted: [],
                            leftPartition: Array.from({ length: i - low + 1 }, (_, idx) => low + idx),
                            rightPartition: Array.from({ length: j - i }, (_, idx) => i + 1 + idx),
                            phase: 'no_swap_needed',
                            explanation: `✅ ${arr[j]} is already in correct position in left partition.`,
                            level: level,
                            callStack: [...callStack]
                        });
                    }
                }
            }

            // Place pivot in correct position
            steps.push({
                array: [...tempArr],
                pivot: high,
                partitionStart: low,
                partitionEnd: high,
                i: i,
                j: -1,
                comparing: [],
                swapping: [i + 1, high],
                sorted: [],
                leftPartition: Array.from({ length: Math.max(0, i - low + 1) }, (_, idx) => low + idx),
                rightPartition: Array.from({ length: high - i - 1 }, (_, idx) => i + 2 + idx),
                phase: 'placing_pivot',
                explanation: `🎯 Placing pivot ${pivot} in its correct position by swapping with element at position ${i + 1}.`,
                level: level,
                callStack: [...callStack]
            });

            [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
            tempArr = [...arr];

            steps.push({
                array: [...tempArr],
                pivot: -1,
                partitionStart: -1,
                partitionEnd: -1,
                i: -1,
                j: -1,
                comparing: [],
                swapping: [],
                sorted: [i + 1],
                leftPartition: Array.from({ length: Math.max(0, i - low + 1) }, (_, idx) => low + idx),
                rightPartition: Array.from({ length: high - i - 1 }, (_, idx) => i + 2 + idx),
                phase: 'pivot_placed',
                explanation: `🎉 Pivot ${arr[i + 1]} is now in its final sorted position ${i + 1}! Left partition has elements ≤ ${arr[i + 1]}, right has elements > ${arr[i + 1]}.`,
                level: level,
                callStack: [...callStack]
            });

            return i + 1;
        }

        // Main quick sort function
        function quickSort(arr, low, high, level = 0, steps, callStack = []) {
            if (low < high) {
                const newCallStack = [...callStack, `quickSort(${low}, ${high})`];

                // Partition and get pivot index
                const pi = partition(arr, low, high, level, steps, newCallStack);

                // Update sorted elements to include all previously placed pivots
                const allSorted = [];
                for (let step of steps) {
                    allSorted.push(...step.sorted);
                }
                const uniqueSorted = [...new Set(allSorted)];

                if (low < pi - 1) {
                    steps.push({
                        array: [...tempArr],
                        pivot: -1,
                        partitionStart: low,
                        partitionEnd: pi - 1,
                        i: -1,
                        j: -1,
                        comparing: [],
                        swapping: [],
                        sorted: uniqueSorted,
                        leftPartition: Array.from({ length: pi - low }, (_, idx) => low + idx),
                        rightPartition: [],
                        phase: 'recursive_left',
                        explanation: `↙️ Recursively sorting left subarray from ${low} to ${pi - 1}.`,
                        level: level + 1,
                        callStack: [...newCallStack, `quickSort(${low}, ${pi - 1})`]
                    });

                    quickSort(arr, low, pi - 1, level + 1, steps, [...newCallStack, `quickSort(${low}, ${pi - 1})`]);
                }

                if (pi + 1 < high) {
                    steps.push({
                        array: [...tempArr],
                        pivot: -1,
                        partitionStart: pi + 1,
                        partitionEnd: high,
                        i: -1,
                        j: -1,
                        comparing: [],
                        swapping: [],
                        sorted: uniqueSorted,
                        leftPartition: [],
                        rightPartition: Array.from({ length: high - pi }, (_, idx) => pi + 1 + idx),
                        phase: 'recursive_right',
                        explanation: `↗️ Recursively sorting right subarray from ${pi + 1} to ${high}.`,
                        level: level + 1,
                        callStack: [...newCallStack, `quickSort(${pi + 1}, ${high})`]
                    });

                    quickSort(arr, pi + 1, high, level + 1, steps, [...newCallStack, `quickSort(${pi + 1}, ${high})`]);
                }
            }
        }

        quickSort(tempArr, 0, n - 1, 0, steps, []);

        steps.push({
            array: [...tempArr],
            pivot: -1,
            partitionStart: -1,
            partitionEnd: -1,
            i: -1,
            j: -1,
            comparing: [],
            swapping: [],
            sorted: Array.from({ length: n }, (_, k) => k),
            leftPartition: [],
            rightPartition: [],
            phase: 'complete',
            explanation: "🎉 Quick Sort Complete! All elements are now in their correct sorted positions through partitioning.",
            level: 0,
            callStack: []
        });

        return steps;
    };

    useEffect(() => {
        const steps = generateQuickSortSteps(array);
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
        pivot: -1,
        partitionStart: -1,
        partitionEnd: -1,
        i: -1,
        j: -1,
        comparing: [],
        swapping: [],
        sorted: [],
        leftPartition: [],
        rightPartition: [],
        phase: 'start',
        explanation: 'Click Start to begin the Quick Sort visualization',
        level: 0,
        callStack: []
    };

    const getBarColor = (index) => {
        if (currentState.sorted.includes(index)) return 'bg-green-500 border-green-600';
        if (currentState.pivot === index) return 'bg-red-500 border-red-600 transform scale-110';
        if (currentState.swapping.includes(index)) return 'bg-purple-500 border-purple-600 animate-pulse';
        if (currentState.comparing.includes(index)) return 'bg-yellow-400 border-yellow-500 transform scale-105';
        if (currentState.i === index || currentState.j === index) return 'bg-blue-500 border-blue-600';
        if (currentState.leftPartition.includes(index)) return 'bg-cyan-400 border-cyan-500';
        if (currentState.rightPartition.includes(index)) return 'bg-pink-400 border-pink-500';
        if (index >= currentState.partitionStart && index <= currentState.partitionEnd && currentState.partitionStart !== -1) {
            return 'bg-amber-300 border-amber-400';
        }
        return 'bg-orange-400 border-orange-500';
    };

    const maxValue = Math.max(...currentState.array);

    const codeExample = `def quick_sort(arr, low=0, high=None):
    if high is None:
        high = len(arr) - 1
    
    if low < high:
        # Partition the array and get pivot index
        pivot_index = partition(arr, low, high)
        
        # Recursively sort elements before and after partition
        quick_sort(arr, low, pivot_index - 1)
        quick_sort(arr, pivot_index + 1, high)

def partition(arr, low, high):
    # Choose the rightmost element as pivot
    pivot = arr[high]
    
    # Index of smaller element (correct position of pivot)
    i = low - 1
    
    for j in range(low, high):
        # If current element is smaller than or equal to pivot
        if arr[j] <= pivot:
            i += 1
            arr[i], arr[j] = arr[j], arr[i]
    
    # Place pivot in correct position
    arr[i + 1], arr[high] = arr[high], arr[i + 1]
    return i + 1`;

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
                            Quick Sort Visualizer
                        </h1>
                        <p className="text-xl text-orange-100 mb-6 max-w-3xl mx-auto">
                            Watch how Quick Sort uses divide-and-conquer by partitioning around a pivot element to efficiently sort the array.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Time: O(n log n) avg</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(log n)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Stable: No</div>
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
                                    min="500"
                                    max="3000"
                                    value={speed}
                                    onChange={(e) => setSpeed(Number(e.target.value))}
                                    className="w-full max-w-md accent-orange-500"
                                />
                                <div className="flex justify-between text-xs text-gray-500 max-w-md mt-1">
                                    <span>Fast (500ms)</span>
                                    <span>Slow (3000ms)</span>
                                </div>
                            </div>

                            {/* Progress */}
                            <div className="mb-6">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-gray-700">
                                        Progress: Step {currentStep + 1} of {stepHistory.length}
                                    </span>
                                    <span className="text-sm text-gray-500">
                                        Level {currentState.level} | Phase: {currentState.phase}
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${((currentStep + 1) / stepHistory.length) * 100}%` }}
                                    ></div>
                                </div>

                                {/* Call Stack */}
                                {currentState.callStack.length > 0 && (
                                    <div className="mt-3 p-2 bg-gray-100 rounded text-xs">
                                        <strong>Call Stack:</strong> {currentState.callStack.join(' → ')}
                                    </div>
                                )}
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
                                        <div className="w-4 h-4 bg-red-500 border border-red-600 rounded"></div>
                                        <span>Pivot</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-amber-300 border border-amber-400 rounded"></div>
                                        <span>Partitioning Range</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-cyan-400 border border-cyan-500 rounded"></div>
                                        <span>Left Partition (≤ pivot)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-pink-400 border border-pink-500 rounded"></div>
                                        <span>Right Partition (&gt; pivot)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-blue-500 border border-blue-600 rounded"></div>
                                        <span>Current Pointers</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-yellow-400 border border-yellow-500 rounded"></div>
                                        <span>Comparing</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-purple-500 border border-purple-600 rounded"></div>
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
                                    <code className="bg-green-100 text-green-800 px-2 py-1 rounded">O(n log n)</code>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-700">Average Case:</span>
                                    <code className="bg-green-100 text-green-800 px-2 py-1 rounded">O(n log n)</code>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-700">Worst Case:</span>
                                    <code className="bg-red-100 text-red-800 px-2 py-1 rounded">O(n²)</code>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-700">Space:</span>
                                    <code className="bg-blue-100 text-blue-800 px-2 py-1 rounded">O(log n)</code>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-700">Stable:</span>
                                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded">No</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-700">In-place:</span>
                                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded">Yes</span>
                                </div>
                            </div>
                        </div>

                        {/* When to Use */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="font-bold text-gray-900 mb-4">When to Use Quick Sort</h3>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li className="flex items-start gap-2">
                                    <span className="text-green-600 mt-1">✓</span>
                                    <span>Large datasets with good pivot selection</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-600 mt-1">✓</span>
                                    <span>Memory-constrained environments (in-place)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-600 mt-1">✓</span>
                                    <span>When average-case performance is acceptable</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-600 mt-1">✓</span>
                                    <span>Cache-efficient sorting needed</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-red-600 mt-1">✗</span>
                                    <span>When worst-case O(n²) is unacceptable</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-red-600 mt-1">✗</span>
                                    <span>When stability is required</span>
                                </li>
                            </ul>
                        </div>

                        {/* Real-world Applications */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="font-bold text-gray-900 mb-4">Real-world Applications</h3>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>Unix sort command implementation</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>Programming language standard libraries</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>Database query optimization</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>Finding k-th smallest/largest element</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>Numerical analysis algorithms</span>
                                </li>
                            </ul>
                        </div>

                        {/* Optimization Tips */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="font-bold text-gray-900 mb-4">Optimization Tips</h3>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>Use median-of-three pivot selection</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>Switch to insertion sort for small subarrays</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>Use tail recursion optimization</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>Implement 3-way partitioning for duplicate keys</span>
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

export default QuickSortPage;