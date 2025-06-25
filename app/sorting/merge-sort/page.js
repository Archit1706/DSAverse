"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Lightbulb, Clock, Code2 } from 'lucide-react';

const MergeSortPage = () => {
    const [array, setArray] = useState([64, 34, 25, 12, 22, 11, 90]);
    const [originalArray] = useState([64, 34, 25, 12, 22, 11, 90]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1000);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);

    const generateMergeSortSteps = (arr) => {
        const steps = [];
        const n = arr.length;
        let tempArr = [...arr];

        steps.push({
            array: [...tempArr],
            leftSection: [],
            rightSection: [],
            merging: [],
            sorted: [],
            currentLeft: -1,
            currentRight: -1,
            phase: 'start',
            explanation: "🎯 Starting Merge Sort: We'll use divide-and-conquer approach. First divide the array into halves, then merge them back in sorted order.",
            level: 0,
            totalLevels: Math.ceil(Math.log2(n))
        });

        // Helper function to add steps for the divide and merge process
        function mergeSort(arr, left, right, level = 0, steps) {
            if (left >= right) return;

            const mid = Math.floor((left + right) / 2);

            // Show the divide step
            steps.push({
                array: [...tempArr],
                leftSection: Array.from({ length: mid - left + 1 }, (_, i) => left + i),
                rightSection: Array.from({ length: right - mid }, (_, i) => mid + 1 + i),
                merging: [],
                sorted: [],
                currentLeft: left,
                currentRight: right,
                phase: 'divide',
                explanation: `🔪 Dividing array from index ${left} to ${right}. Split at index ${mid}. Left: [${left}...${mid}], Right: [${mid + 1}...${right}]`,
                level: level,
                totalLevels: Math.ceil(Math.log2(n))
            });

            // Recursively sort left half
            mergeSort(arr, left, mid, level + 1, steps);

            // Recursively sort right half
            mergeSort(arr, mid + 1, right, level + 1, steps);

            // Merge the two halves
            merge(arr, left, mid, right, level, steps);
        }

        function merge(arr, left, mid, right, level, steps) {
            const leftArr = [];
            const rightArr = [];

            // Copy data to temp arrays
            for (let i = left; i <= mid; i++) {
                leftArr.push(tempArr[i]);
            }
            for (let i = mid + 1; i <= right; i++) {
                rightArr.push(tempArr[i]);
            }

            steps.push({
                array: [...tempArr],
                leftSection: Array.from({ length: mid - left + 1 }, (_, i) => left + i),
                rightSection: Array.from({ length: right - mid }, (_, i) => mid + 1 + i),
                merging: Array.from({ length: right - left + 1 }, (_, i) => left + i),
                sorted: [],
                currentLeft: -1,
                currentRight: -1,
                phase: 'merge_start',
                explanation: `🔄 Starting merge of left subarray [${leftArr.join(', ')}] and right subarray [${rightArr.join(', ')}]`,
                level: level,
                totalLevels: Math.ceil(Math.log2(n))
            });

            let i = 0, j = 0, k = left;

            // Merge the temp arrays back into arr[left..right]
            while (i < leftArr.length && j < rightArr.length) {
                steps.push({
                    array: [...tempArr],
                    leftSection: Array.from({ length: mid - left + 1 }, (_, idx) => left + idx),
                    rightSection: Array.from({ length: right - mid }, (_, idx) => mid + 1 + idx),
                    merging: Array.from({ length: right - left + 1 }, (_, idx) => left + idx),
                    sorted: [],
                    currentLeft: left + i,
                    currentRight: mid + 1 + j,
                    phase: 'merging',
                    explanation: `🔍 Comparing ${leftArr[i]} (left) with ${rightArr[j]} (right). ${leftArr[i] <= rightArr[j] ? `${leftArr[i]} ≤ ${rightArr[j]}, take from left` : `${leftArr[i]} > ${rightArr[j]}, take from right`}`,
                    level: level,
                    totalLevels: Math.ceil(Math.log2(n))
                });

                if (leftArr[i] <= rightArr[j]) {
                    tempArr[k] = leftArr[i];
                    i++;
                } else {
                    tempArr[k] = rightArr[j];
                    j++;
                }

                steps.push({
                    array: [...tempArr],
                    leftSection: Array.from({ length: mid - left + 1 }, (_, idx) => left + idx),
                    rightSection: Array.from({ length: right - mid }, (_, idx) => mid + 1 + idx),
                    merging: Array.from({ length: right - left + 1 }, (_, idx) => left + idx),
                    sorted: [k],
                    currentLeft: left + i,
                    currentRight: mid + 1 + j,
                    phase: 'placing',
                    explanation: `✅ Placed ${tempArr[k]} at position ${k}`,
                    level: level,
                    totalLevels: Math.ceil(Math.log2(n))
                });
                k++;
            }

            // Copy remaining elements of leftArr[], if any
            while (i < leftArr.length) {
                steps.push({
                    array: [...tempArr],
                    leftSection: Array.from({ length: mid - left + 1 }, (_, idx) => left + idx),
                    rightSection: Array.from({ length: right - mid }, (_, idx) => mid + 1 + idx),
                    merging: Array.from({ length: right - left + 1 }, (_, idx) => left + idx),
                    sorted: [],
                    currentLeft: left + i,
                    currentRight: -1,
                    phase: 'copying_left',
                    explanation: `📋 Copying remaining element ${leftArr[i]} from left subarray to position ${k}`,
                    level: level,
                    totalLevels: Math.ceil(Math.log2(n))
                });

                tempArr[k] = leftArr[i];
                steps.push({
                    array: [...tempArr],
                    leftSection: Array.from({ length: mid - left + 1 }, (_, idx) => left + idx),
                    rightSection: Array.from({ length: right - mid }, (_, idx) => mid + 1 + idx),
                    merging: Array.from({ length: right - left + 1 }, (_, idx) => left + idx),
                    sorted: [k],
                    currentLeft: -1,
                    currentRight: -1,
                    phase: 'placed',
                    explanation: `✅ Placed ${tempArr[k]} at position ${k}`,
                    level: level,
                    totalLevels: Math.ceil(Math.log2(n))
                });
                i++;
                k++;
            }

            // Copy remaining elements of rightArr[], if any
            while (j < rightArr.length) {
                steps.push({
                    array: [...tempArr],
                    leftSection: Array.from({ length: mid - left + 1 }, (_, idx) => left + idx),
                    rightSection: Array.from({ length: right - mid }, (_, idx) => mid + 1 + idx),
                    merging: Array.from({ length: right - left + 1 }, (_, idx) => left + idx),
                    sorted: [],
                    currentLeft: -1,
                    currentRight: mid + 1 + j,
                    phase: 'copying_right',
                    explanation: `📋 Copying remaining element ${rightArr[j]} from right subarray to position ${k}`,
                    level: level,
                    totalLevels: Math.ceil(Math.log2(n))
                });

                tempArr[k] = rightArr[j];
                steps.push({
                    array: [...tempArr],
                    leftSection: Array.from({ length: mid - left + 1 }, (_, idx) => left + idx),
                    rightSection: Array.from({ length: right - mid }, (_, idx) => mid + 1 + idx),
                    merging: Array.from({ length: right - left + 1 }, (_, idx) => left + idx),
                    sorted: [k],
                    currentLeft: -1,
                    currentRight: -1,
                    phase: 'placed',
                    explanation: `✅ Placed ${tempArr[k]} at position ${k}`,
                    level: level,
                    totalLevels: Math.ceil(Math.log2(n))
                });
                j++;
                k++;
            }

            steps.push({
                array: [...tempArr],
                leftSection: [],
                rightSection: [],
                merging: [],
                sorted: Array.from({ length: right - left + 1 }, (_, idx) => left + idx),
                currentLeft: -1,
                currentRight: -1,
                phase: 'merge_complete',
                explanation: `🎉 Merge complete! Subarray from ${left} to ${right} is now sorted: [${tempArr.slice(left, right + 1).join(', ')}]`,
                level: level,
                totalLevels: Math.ceil(Math.log2(n))
            });
        }

        mergeSort(tempArr, 0, n - 1, 0, steps);

        steps.push({
            array: [...tempArr],
            leftSection: [],
            rightSection: [],
            merging: [],
            sorted: Array.from({ length: n }, (_, k) => k),
            currentLeft: -1,
            currentRight: -1,
            phase: 'complete',
            explanation: "🎉 Merge Sort Complete! The entire array is now sorted through the divide-and-conquer approach.",
            level: Math.ceil(Math.log2(n)),
            totalLevels: Math.ceil(Math.log2(n))
        });

        return steps;
    };

    useEffect(() => {
        const steps = generateMergeSortSteps(array);
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
        leftSection: [],
        rightSection: [],
        merging: [],
        sorted: [],
        currentLeft: -1,
        currentRight: -1,
        phase: 'start',
        explanation: 'Click Start to begin the Merge Sort visualization',
        level: 0,
        totalLevels: 0
    };

    const getBarColor = (index) => {
        if (currentState.sorted.includes(index)) return 'bg-green-500 border-green-600';
        if (currentState.currentLeft === index) return 'bg-blue-500 border-blue-600 transform scale-110';
        if (currentState.currentRight === index) return 'bg-purple-500 border-purple-600 transform scale-110';
        if (currentState.leftSection.includes(index)) return 'bg-cyan-400 border-cyan-500';
        if (currentState.rightSection.includes(index)) return 'bg-pink-400 border-pink-500';
        if (currentState.merging.includes(index)) return 'bg-yellow-400 border-yellow-500';
        return 'bg-orange-400 border-orange-500';
    };

    const maxValue = Math.max(...currentState.array);

    const codeExample = `def merge_sort(arr):
    if len(arr) <= 1:
        return arr
    
    # Divide the array into two halves
    mid = len(arr) // 2
    left_half = arr[:mid]
    right_half = arr[mid:]
    
    # Recursively sort both halves
    left_sorted = merge_sort(left_half)
    right_sorted = merge_sort(right_half)
    
    # Merge the sorted halves
    return merge(left_sorted, right_sorted)

def merge(left, right):
    result = []
    i = j = 0
    
    # Compare elements and merge in sorted order
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i])
            i += 1
        else:
            result.append(right[j])
            j += 1
    
    # Add remaining elements
    result.extend(left[i:])
    result.extend(right[j:])
    
    return result`;

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
                            Merge Sort Visualizer
                        </h1>
                        <p className="text-xl text-orange-100 mb-6 max-w-3xl mx-auto">
                            Watch how Merge Sort uses divide-and-conquer to split the array into halves and merge them back in sorted order.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Time: O(n log n)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(n)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Stable: Yes</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Divide & Conquer</div>
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
                                        Level {currentState.level} of {currentState.totalLevels} | Phase: {currentState.phase}
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
                                        <div className="w-4 h-4 bg-cyan-400 border border-cyan-500 rounded"></div>
                                        <span>Left Section</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-pink-400 border border-pink-500 rounded"></div>
                                        <span>Right Section</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-blue-500 border border-blue-600 rounded"></div>
                                        <span>Left Pointer</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-purple-500 border border-purple-600 rounded"></div>
                                        <span>Right Pointer</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-yellow-400 border border-yellow-500 rounded"></div>
                                        <span>Merging</span>
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
                                    <code className="bg-green-100 text-green-800 px-2 py-1 rounded">O(n log n)</code>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-700">Space:</span>
                                    <code className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">O(n)</code>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-700">Stable:</span>
                                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded">Yes</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-700">In-place:</span>
                                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded">No</span>
                                </div>
                            </div>
                        </div>

                        {/* When to Use */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="font-bold text-gray-900 mb-4">When to Use Merge Sort</h3>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li className="flex items-start gap-2">
                                    <span className="text-green-600 mt-1">✓</span>
                                    <span>Large datasets requiring guaranteed O(n log n)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-600 mt-1">✓</span>
                                    <span>When stability is required</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-600 mt-1">✓</span>
                                    <span>External sorting (data doesn&apos;t fit in memory)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-600 mt-1">✓</span>
                                    <span>Parallel processing applications</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-red-600 mt-1">✗</span>
                                    <span>Memory-constrained environments</span>
                                </li>
                            </ul>
                        </div>

                        {/* Real-world Applications */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="font-bold text-gray-900 mb-4">Real-world Applications</h3>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>Database sorting operations</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>External sorting of large files</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>Parallel computing algorithms</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>Version control systems (like Git)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>Inversion count problems</span>
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

export default MergeSortPage;