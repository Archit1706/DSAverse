"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Lightbulb, Clock, Code2 } from 'lucide-react';

const BucketSortPage = () => {
    const [array, setArray] = useState([64, 34, 25, 12, 22, 11, 90]);
    const [originalArray] = useState([64, 34, 25, 12, 22, 11, 90]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1200);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);

    const generateBucketSortSteps = (arr) => {
        const steps = [];
        let tempArr = [...arr];
        const n = tempArr.length;

        // Determine bucket count and ranges
        const bucketCount = Math.max(3, Math.min(n, 5)); // 3-5 buckets for visualization
        const minVal = Math.min(...tempArr);
        const maxVal = Math.max(...tempArr);
        const range = maxVal - minVal + 1;
        const bucketSize = Math.ceil(range / bucketCount);

        // Initialize buckets
        const buckets = Array(bucketCount).fill().map(() => []);

        steps.push({
            array: [...tempArr],
            buckets: buckets.map(bucket => [...bucket]),
            bucketRanges: Array(bucketCount).fill().map((_, i) => ({
                min: minVal + i * bucketSize,
                max: minVal + (i + 1) * bucketSize - 1
            })),
            phase: 'start',
            highlightedElements: [],
            activeBucket: -1,
            sortingBucket: -1,
            explanation: `🎯 Starting Bucket Sort: Creating ${bucketCount} buckets with range ${minVal}-${maxVal}. Each bucket covers ~${bucketSize} values.`,
            currentElement: -1,
            bucketCount: bucketCount
        });

        // Show bucket ranges
        steps.push({
            array: [...tempArr],
            buckets: buckets.map(bucket => [...bucket]),
            bucketRanges: Array(bucketCount).fill().map((_, i) => ({
                min: minVal + i * bucketSize,
                max: minVal + (i + 1) * bucketSize - 1
            })),
            phase: 'buckets_created',
            highlightedElements: [],
            activeBucket: -1,
            sortingBucket: -1,
            explanation: `📦 Created ${bucketCount} buckets: ${Array(bucketCount).fill().map((_, i) => `Bucket ${i}: [${minVal + i * bucketSize}-${minVal + (i + 1) * bucketSize - 1}]`).join(', ')}`,
            currentElement: -1,
            bucketCount: bucketCount
        });

        // Distribute elements into buckets
        for (let i = 0; i < tempArr.length; i++) {
            const element = tempArr[i];
            const bucketIndex = Math.min(Math.floor((element - minVal) / bucketSize), bucketCount - 1);

            steps.push({
                array: [...tempArr],
                buckets: buckets.map(bucket => [...bucket]),
                bucketRanges: Array(bucketCount).fill().map((_, j) => ({
                    min: minVal + j * bucketSize,
                    max: minVal + (j + 1) * bucketSize - 1
                })),
                phase: 'distributing',
                highlightedElements: [i],
                activeBucket: bucketIndex,
                sortingBucket: -1,
                explanation: `📥 Element ${element} goes to bucket ${bucketIndex} (range: ${minVal + bucketIndex * bucketSize}-${minVal + (bucketIndex + 1) * bucketSize - 1})`,
                currentElement: element,
                bucketCount: bucketCount
            });

            buckets[bucketIndex].push({ value: element, originalIndex: i });

            steps.push({
                array: [...tempArr],
                buckets: buckets.map(bucket => [...bucket]),
                bucketRanges: Array(bucketCount).fill().map((_, j) => ({
                    min: minVal + j * bucketSize,
                    max: minVal + (j + 1) * bucketSize - 1
                })),
                phase: 'distributed',
                highlightedElements: [],
                activeBucket: bucketIndex,
                sortingBucket: -1,
                explanation: `✅ Added ${element} to bucket ${bucketIndex}. Bucket now contains: [${buckets[bucketIndex].map(item => item.value).join(', ')}]`,
                currentElement: element,
                bucketCount: bucketCount
            });
        }

        // Show all elements distributed
        steps.push({
            array: [...tempArr],
            buckets: buckets.map(bucket => [...bucket]),
            bucketRanges: Array(bucketCount).fill().map((_, j) => ({
                min: minVal + j * bucketSize,
                max: minVal + (j + 1) * bucketSize - 1
            })),
            phase: 'distribution_complete',
            highlightedElements: [],
            activeBucket: -1,
            sortingBucket: -1,
            explanation: `🎉 Distribution complete! All elements are now in their respective buckets. Next, we'll sort each non-empty bucket individually.`,
            currentElement: -1,
            bucketCount: bucketCount
        });

        // Sort individual buckets (using insertion sort for simplicity)
        for (let bucketIndex = 0; bucketIndex < bucketCount; bucketIndex++) {
            if (buckets[bucketIndex].length > 0) {
                steps.push({
                    array: [...tempArr],
                    buckets: buckets.map(bucket => [...bucket]),
                    bucketRanges: Array(bucketCount).fill().map((_, j) => ({
                        min: minVal + j * bucketSize,
                        max: minVal + (j + 1) * bucketSize - 1
                    })),
                    phase: 'sorting_bucket',
                    highlightedElements: [],
                    activeBucket: bucketIndex,
                    sortingBucket: bucketIndex,
                    explanation: `🔧 Sorting bucket ${bucketIndex} with ${buckets[bucketIndex].length} elements: [${buckets[bucketIndex].map(item => item.value).join(', ')}]`,
                    currentElement: -1,
                    bucketCount: bucketCount
                });

                // Simple insertion sort for the bucket
                const bucket = buckets[bucketIndex];
                for (let i = 1; i < bucket.length; i++) {
                    const key = bucket[i];
                    let j = i - 1;

                    while (j >= 0 && bucket[j].value > key.value) {
                        bucket[j + 1] = bucket[j];
                        j--;
                    }
                    bucket[j + 1] = key;
                }

                steps.push({
                    array: [...tempArr],
                    buckets: buckets.map(bucket => [...bucket]),
                    bucketRanges: Array(bucketCount).fill().map((_, j) => ({
                        min: minVal + j * bucketSize,
                        max: minVal + (j + 1) * bucketSize - 1
                    })),
                    phase: 'bucket_sorted',
                    highlightedElements: [],
                    activeBucket: bucketIndex,
                    sortingBucket: -1,
                    explanation: `✅ Bucket ${bucketIndex} sorted: [${buckets[bucketIndex].map(item => item.value).join(', ')}]`,
                    currentElement: -1,
                    bucketCount: bucketCount
                });
            }
        }

        // Show all buckets sorted
        steps.push({
            array: [...tempArr],
            buckets: buckets.map(bucket => [...bucket]),
            bucketRanges: Array(bucketCount).fill().map((_, j) => ({
                min: minVal + j * bucketSize,
                max: minVal + (j + 1) * bucketSize - 1
            })),
            phase: 'all_buckets_sorted',
            highlightedElements: [],
            activeBucket: -1,
            sortingBucket: -1,
            explanation: `🎉 All buckets sorted! Now concatenating buckets in order to form the final sorted array.`,
            currentElement: -1,
            bucketCount: bucketCount
        });

        // Concatenate buckets back to array
        let sortedArray = [];
        let arrayIndex = 0;

        for (let bucketIndex = 0; bucketIndex < bucketCount; bucketIndex++) {
            if (buckets[bucketIndex].length > 0) {
                steps.push({
                    array: [...tempArr],
                    buckets: buckets.map(bucket => [...bucket]),
                    bucketRanges: Array(bucketCount).fill().map((_, j) => ({
                        min: minVal + j * bucketSize,
                        max: minVal + (j + 1) * bucketSize - 1
                    })),
                    phase: 'concatenating',
                    highlightedElements: [],
                    activeBucket: bucketIndex,
                    sortingBucket: -1,
                    explanation: `🔄 Concatenating bucket ${bucketIndex}: [${buckets[bucketIndex].map(item => item.value).join(', ')}] to the final array`,
                    currentElement: -1,
                    bucketCount: bucketCount
                });

                for (let item of buckets[bucketIndex]) {
                    sortedArray.push(item.value);
                    tempArr[arrayIndex] = item.value;
                    arrayIndex++;

                    steps.push({
                        array: [...tempArr],
                        buckets: buckets.map(bucket => [...bucket]),
                        bucketRanges: Array(bucketCount).fill().map((_, j) => ({
                            min: minVal + j * bucketSize,
                            max: minVal + (j + 1) * bucketSize - 1
                        })),
                        phase: 'concatenating_element',
                        highlightedElements: [arrayIndex - 1],
                        activeBucket: bucketIndex,
                        sortingBucket: -1,
                        explanation: `➡️ Moved ${item.value} from bucket ${bucketIndex} to position ${arrayIndex - 1} in the final array`,
                        currentElement: item.value,
                        bucketCount: bucketCount
                    });
                }
            }
        }

        steps.push({
            array: [...tempArr],
            buckets: Array(bucketCount).fill().map(() => []),
            bucketRanges: Array(bucketCount).fill().map((_, j) => ({
                min: minVal + j * bucketSize,
                max: minVal + (j + 1) * bucketSize - 1
            })),
            phase: 'complete',
            highlightedElements: Array.from({ length: tempArr.length }, (_, i) => i),
            activeBucket: -1,
            sortingBucket: -1,
            explanation: `🎉 Bucket Sort Complete! All elements have been sorted through distribution, individual bucket sorting, and concatenation.`,
            currentElement: -1,
            bucketCount: bucketCount
        });

        return steps;
    };

    useEffect(() => {
        const steps = generateBucketSortSteps(array);
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
        const newArray = Array.from({ length: 7 }, () => Math.floor(Math.random() * 80) + 10);
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
        buckets: Array(3).fill().map(() => []),
        bucketRanges: [],
        phase: 'start',
        highlightedElements: [],
        activeBucket: -1,
        sortingBucket: -1,
        explanation: 'Click Start to begin the Bucket Sort visualization',
        currentElement: -1,
        bucketCount: 3
    };

    const getBarColor = (index) => {
        if (currentState.phase === 'complete') return 'bg-green-500 border-green-600';
        if (currentState.highlightedElements.includes(index)) return 'bg-red-500 border-red-600 transform scale-110';
        return 'bg-orange-400 border-orange-500';
    };

    const getBucketColor = (bucketIndex) => {
        if (currentState.sortingBucket === bucketIndex) return 'bg-purple-100 border-purple-300 shadow-lg';
        if (currentState.activeBucket === bucketIndex) return 'bg-blue-100 border-blue-300 shadow-lg';
        return 'bg-gray-50 border-gray-200';
    };

    const maxValue = Math.max(...currentState.array);

    const codeExample = `def bucket_sort(arr):
    if len(arr) == 0:
        return arr
    
    # Determine bucket count and range
    bucket_count = len(arr)
    min_val, max_val = min(arr), max(arr)
    
    # Create empty buckets
    buckets = [[] for _ in range(bucket_count)]
    
    # Distribute elements into buckets
    for num in arr:
        # Calculate bucket index
        bucket_index = int((num - min_val) * bucket_count / (max_val - min_val + 1))
        bucket_index = min(bucket_index, bucket_count - 1)  # Handle edge case
        buckets[bucket_index].append(num)
    
    # Sort individual buckets and concatenate
    sorted_array = []
    for bucket in buckets:
        bucket.sort()  # Can use any sorting algorithm
        sorted_array.extend(bucket)
    
    return sorted_array

# Alternative implementation with insertion sort for buckets
def bucket_sort_insertion(arr):
    if len(arr) == 0:
        return arr
    
    bucket_count = len(arr)
    min_val, max_val = min(arr), max(arr)
    buckets = [[] for _ in range(bucket_count)]
    
    # Distribute elements
    for num in arr:
        bucket_index = int((num - min_val) * bucket_count / (max_val - min_val + 1))
        bucket_index = min(bucket_index, bucket_count - 1)
        buckets[bucket_index].append(num)
    
    # Sort each bucket using insertion sort
    for bucket in buckets:
        insertion_sort(bucket)
    
    # Concatenate buckets
    sorted_array = []
    for bucket in buckets:
        sorted_array.extend(bucket)
    
    return sorted_array

def insertion_sort(arr):
    for i in range(1, len(arr)):
        key = arr[i]
        j = i - 1
        while j >= 0 and arr[j] > key:
            arr[j + 1] = arr[j]
            j -= 1
        arr[j + 1] = key`;

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
                            Bucket Sort Visualizer
                        </h1>
                        <p className="text-xl text-orange-100 mb-6 max-w-3xl mx-auto">
                            Watch how Bucket Sort distributes elements into buckets, sorts each bucket individually, and concatenates them for the final result.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Time: O(n + k) avg</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(n + k)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Stable: Yes</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Distribution-based</div>
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
                                    min="600"
                                    max="3000"
                                    value={speed}
                                    onChange={(e) => setSpeed(Number(e.target.value))}
                                    className="w-full max-w-md accent-orange-500"
                                />
                                <div className="flex justify-between text-xs text-gray-500 max-w-md mt-1">
                                    <span>Fast (600ms)</span>
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
                                        Phase: {currentState.phase} | Buckets: {currentState.bucketCount}
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
                                <h3 className="text-lg font-semibold mb-3 text-gray-800">Current Array</h3>
                                <div className="flex items-end justify-center gap-2 h-48 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                                    {currentState.array.map((value, index) => (
                                        <div key={index} className="flex flex-col items-center">
                                            <div
                                                className={`w-16 transition-all duration-500 border-2 rounded-t-lg flex items-end justify-center ${getBarColor(index)}`}
                                                style={{
                                                    height: `${(value / maxValue) * 160}px`,
                                                }}
                                            >
                                                <span className="text-white font-bold text-sm mb-1">{value}</span>
                                            </div>
                                            <span className="text-xs text-gray-500 mt-1">{index}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Buckets Visualization */}
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold mb-3 text-gray-800">Buckets</h3>
                                <div className="grid grid-cols-1 gap-3">
                                    {currentState.buckets.map((bucket, bucketIndex) => (
                                        <div key={bucketIndex} className={`${getBucketColor(bucketIndex)} border-2 rounded-lg p-3 transition-all duration-300`}>
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="font-bold text-gray-700">
                                                    Bucket {bucketIndex}
                                                </div>
                                                {currentState.bucketRanges[bucketIndex] && (
                                                    <div className="text-sm text-gray-600">
                                                        Range: {currentState.bucketRanges[bucketIndex].min}-{currentState.bucketRanges[bucketIndex].max}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex gap-1 flex-wrap min-h-8">
                                                {bucket.map((item, itemIndex) => (
                                                    <div
                                                        key={itemIndex}
                                                        className="bg-orange-400 text-white text-sm rounded px-3 py-1 text-center font-medium"
                                                    >
                                                        {item.value}
                                                    </div>
                                                ))}
                                                {bucket.length === 0 && (
                                                    <div className="text-gray-400 text-sm italic">Empty</div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="flex flex-wrap justify-center gap-4 mb-6 text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-orange-400 border border-orange-500 rounded"></div>
                                    <span>Array Elements</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-red-500 border border-red-600 rounded"></div>
                                    <span>Currently Processing</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
                                    <span>Active Bucket</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-purple-100 border border-purple-300 rounded"></div>
                                    <span>Sorting Bucket</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-green-500 border border-green-600 rounded"></div>
                                    <span>Sorted</span>
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
                                    <code className="bg-green-100 text-green-800 px-2 py-1 rounded">O(n + k)</code>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-700">Average Case:</span>
                                    <code className="bg-green-100 text-green-800 px-2 py-1 rounded">O(n + k)</code>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-700">Worst Case:</span>
                                    <code className="bg-red-100 text-red-800 px-2 py-1 rounded">O(n²)</code>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-700">Space:</span>
                                    <code className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">O(n + k)</code>
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
                            <div className="mt-3 text-xs text-gray-600">
                                <p><strong>n</strong> = number of elements</p>
                                <p><strong>k</strong> = number of buckets</p>
                            </div>
                        </div>

                        {/* When to Use */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="font-bold text-gray-900 mb-4">When to Use Bucket Sort</h3>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li className="flex items-start gap-2">
                                    <span className="text-green-600 mt-1">✓</span>
                                    <span>Uniformly distributed data</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-600 mt-1">✓</span>
                                    <span>Known range of input values</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-600 mt-1">✓</span>
                                    <span>Floating-point numbers in [0,1)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-600 mt-1">✓</span>
                                    <span>When stability is required</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-red-600 mt-1">✗</span>
                                    <span>Skewed or clustered data distribution</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-red-600 mt-1">✗</span>
                                    <span>Unknown or very large value ranges</span>
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
                                    <span>Sorting floating-point numbers</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>Histogram creation</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>Parallel sorting algorithms</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>External sorting of large datasets</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>Statistical data analysis</span>
                                </li>
                            </ul>
                        </div>

                        {/* Key Characteristics */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="font-bold text-gray-900 mb-4">Key Characteristics</h3>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>Distribution-based sorting algorithm</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>Performance depends on data distribution</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>Uses auxiliary sorting for individual buckets</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>Can achieve linear time with good distribution</span>
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

export default BucketSortPage;