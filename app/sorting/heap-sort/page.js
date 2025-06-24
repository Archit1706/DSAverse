"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, ArrowLeft, Lightbulb, Clock, Code2 } from 'lucide-react';

const HeapSortPage = () => {
    const [array, setArray] = useState([64, 34, 25, 12, 22, 11, 90]);
    const [originalArray] = useState([64, 34, 25, 12, 22, 11, 90]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1000);
    const [stepHistory, setStepHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [showCode, setShowCode] = useState(false);

    const generateHeapSortSteps = (arr) => {
        const steps = [];
        const n = arr.length;
        let tempArr = [...arr];

        steps.push({
            array: [...tempArr],
            heapSize: n,
            comparing: [],
            swapping: [],
            sorted: [],
            currentRoot: -1,
            leftChild: -1,
            rightChild: -1,
            phase: 'start',
            explanation: "🎯 Starting Heap Sort: First, we'll build a max heap from the array, then repeatedly extract the maximum element.",
            heapifyNode: -1,
            maxElement: -1
        });

        // Helper function to heapify a subtree rooted at node i
        function heapify(arr, n, i, steps, phase = 'build') {
            let largest = i;
            let left = 2 * i + 1;
            let right = 2 * i + 2;

            steps.push({
                array: [...tempArr],
                heapSize: n,
                comparing: [],
                swapping: [],
                sorted: phase === 'sort' ? Array.from({ length: tempArr.length - n }, (_, idx) => n + idx) : [],
                currentRoot: i,
                leftChild: left < n ? left : -1,
                rightChild: right < n ? right : -1,
                phase: phase,
                explanation: `🔍 Heapifying node ${i} (value: ${arr[i]}). Checking children: left=${left < n ? `${left} (${arr[left]})` : 'none'}, right=${right < n ? `${right} (${arr[right]})` : 'none'}`,
                heapifyNode: i,
                maxElement: -1
            });

            // Check if left child exists and is greater than root
            if (left < n) {
                steps.push({
                    array: [...tempArr],
                    heapSize: n,
                    comparing: [largest, left],
                    swapping: [],
                    sorted: phase === 'sort' ? Array.from({ length: tempArr.length - n }, (_, idx) => n + idx) : [],
                    currentRoot: i,
                    leftChild: left,
                    rightChild: right < n ? right : -1,
                    phase: phase,
                    explanation: `🔍 Comparing root ${arr[largest]} with left child ${arr[left]}. ${arr[left] > arr[largest] ? `Left child is larger!` : `Root is larger or equal.`}`,
                    heapifyNode: i,
                    maxElement: -1
                });

                if (arr[left] > arr[largest]) {
                    largest = left;
                }
            }

            // Check if right child exists and is greater than largest so far
            if (right < n) {
                steps.push({
                    array: [...tempArr],
                    heapSize: n,
                    comparing: [largest, right],
                    swapping: [],
                    sorted: phase === 'sort' ? Array.from({ length: tempArr.length - n }, (_, idx) => n + idx) : [],
                    currentRoot: i,
                    leftChild: left < n ? left : -1,
                    rightChild: right,
                    phase: phase,
                    explanation: `🔍 Comparing current largest ${arr[largest]} with right child ${arr[right]}. ${arr[right] > arr[largest] ? `Right child is larger!` : `Current largest remains.`}`,
                    heapifyNode: i,
                    maxElement: -1
                });

                if (arr[right] > arr[largest]) {
                    largest = right;
                }
            }

            // If largest is not root, swap and continue heapifying
            if (largest !== i) {
                steps.push({
                    array: [...tempArr],
                    heapSize: n,
                    comparing: [],
                    swapping: [i, largest],
                    sorted: phase === 'sort' ? Array.from({ length: tempArr.length - n }, (_, idx) => n + idx) : [],
                    currentRoot: i,
                    leftChild: left < n ? left : -1,
                    rightChild: right < n ? right : -1,
                    phase: phase,
                    explanation: `🔄 Swapping ${arr[i]} at position ${i} with ${arr[largest]} at position ${largest} to maintain max heap property.`,
                    heapifyNode: i,
                    maxElement: -1
                });

                [arr[i], arr[largest]] = [arr[largest], arr[i]];
                tempArr = [...arr];

                steps.push({
                    array: [...tempArr],
                    heapSize: n,
                    comparing: [],
                    swapping: [],
                    sorted: phase === 'sort' ? Array.from({ length: tempArr.length - n }, (_, idx) => n + idx) : [],
                    currentRoot: largest,
                    leftChild: -1,
                    rightChild: -1,
                    phase: phase,
                    explanation: `✅ Swapped! Now continuing to heapify the affected subtree at position ${largest}.`,
                    heapifyNode: largest,
                    maxElement: -1
                });

                // Recursively heapify the affected sub-tree
                heapify(arr, n, largest, steps, phase);
            } else {
                steps.push({
                    array: [...tempArr],
                    heapSize: n,
                    comparing: [],
                    swapping: [],
                    sorted: phase === 'sort' ? Array.from({ length: tempArr.length - n }, (_, idx) => n + idx) : [],
                    currentRoot: -1,
                    leftChild: -1,
                    rightChild: -1,
                    phase: phase,
                    explanation: `✅ Node ${i} is already in correct position. Max heap property satisfied for this subtree.`,
                    heapifyNode: -1,
                    maxElement: -1
                });
            }
        }

        // Build heap (rearrange array)
        steps.push({
            array: [...tempArr],
            heapSize: n,
            comparing: [],
            swapping: [],
            sorted: [],
            currentRoot: -1,
            leftChild: -1,
            rightChild: -1,
            phase: 'build_start',
            explanation: `🏗️ Building Max Heap: Starting from the last non-leaf node (${Math.floor(n / 2) - 1}) and working backwards.`,
            heapifyNode: -1,
            maxElement: -1
        });

        for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
            heapify(tempArr, n, i, steps, 'build');
        }

        steps.push({
            array: [...tempArr],
            heapSize: n,
            comparing: [],
            swapping: [],
            sorted: [],
            currentRoot: -1,
            leftChild: -1,
            rightChild: -1,
            phase: 'heap_built',
            explanation: `🎉 Max Heap Built! The largest element ${tempArr[0]} is now at the root. Array represents a complete binary tree with max heap property.`,
            heapifyNode: -1,
            maxElement: 0
        });

        // Extract elements from heap one by one
        for (let i = n - 1; i > 0; i--) {
            steps.push({
                array: [...tempArr],
                heapSize: i + 1,
                comparing: [],
                swapping: [0, i],
                sorted: Array.from({ length: n - i - 1 }, (_, idx) => i + 1 + idx),
                currentRoot: 0,
                leftChild: -1,
                rightChild: -1,
                phase: 'extracting',
                explanation: `📤 Extracting maximum ${tempArr[0]} from heap. Swapping with last element ${tempArr[i]} at position ${i}.`,
                heapifyNode: -1,
                maxElement: 0
            });

            // Move current root to end
            [tempArr[0], tempArr[i]] = [tempArr[i], tempArr[0]];

            steps.push({
                array: [...tempArr],
                heapSize: i,
                comparing: [],
                swapping: [],
                sorted: Array.from({ length: n - i }, (_, idx) => i + idx),
                currentRoot: 0,
                leftChild: -1,
                rightChild: -1,
                phase: 'extracted',
                explanation: `✅ Extracted! ${tempArr[i]} is now in its final sorted position. Heap size reduced to ${i}. Now re-heapifying from root.`,
                heapifyNode: 0,
                maxElement: -1
            });

            // Call heapify on the reduced heap
            heapify(tempArr, i, 0, steps, 'sort');
        }

        steps.push({
            array: [...tempArr],
            heapSize: 0,
            comparing: [],
            swapping: [],
            sorted: Array.from({ length: n }, (_, k) => k),
            currentRoot: -1,
            leftChild: -1,
            rightChild: -1,
            phase: 'complete',
            explanation: "🎉 Heap Sort Complete! All elements have been extracted from the heap and are now in sorted order.",
            heapifyNode: -1,
            maxElement: -1
        });

        return steps;
    };

    useEffect(() => {
        const steps = generateHeapSortSteps(array);
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
        heapSize: array.length,
        comparing: [],
        swapping: [],
        sorted: [],
        currentRoot: -1,
        leftChild: -1,
        rightChild: -1,
        phase: 'start',
        explanation: 'Click Start to begin the Heap Sort visualization',
        heapifyNode: -1,
        maxElement: -1
    };

    const getBarColor = (index) => {
        if (currentState.sorted.includes(index)) return 'bg-green-500 border-green-600';
        if (currentState.maxElement === index) return 'bg-red-500 border-red-600 transform scale-110';
        if (currentState.swapping.includes(index)) return 'bg-purple-500 border-purple-600 animate-pulse';
        if (currentState.comparing.includes(index)) return 'bg-yellow-400 border-yellow-500 transform scale-105';
        if (currentState.currentRoot === index) return 'bg-blue-500 border-blue-600';
        if (currentState.leftChild === index || currentState.rightChild === index) return 'bg-cyan-400 border-cyan-500';
        if (index >= currentState.heapSize) return 'bg-gray-300 border-gray-400';
        return 'bg-orange-400 border-orange-500';
    };

    const maxValue = Math.max(...currentState.array);

    // Generate heap tree visualization
    const generateHeapTree = () => {
        const tree = [];
        const heapArray = currentState.array.slice(0, currentState.heapSize);

        const levels = Math.ceil(Math.log2(heapArray.length + 1));
        for (let level = 0; level < levels; level++) {
            const levelNodes = [];
            const startIndex = Math.pow(2, level) - 1;
            const endIndex = Math.min(Math.pow(2, level + 1) - 1, heapArray.length);

            for (let i = startIndex; i < endIndex; i++) {
                if (i < heapArray.length) {
                    levelNodes.push({
                        value: heapArray[i],
                        index: i,
                        color: getBarColor(i)
                    });
                }
            }
            if (levelNodes.length > 0) {
                tree.push(levelNodes);
            }
        }
        return tree;
    };

    const heapTree = generateHeapTree();

    const codeExample = `def heap_sort(arr):
    n = len(arr)
    
    # Build max heap
    for i in range(n // 2 - 1, -1, -1):
        heapify(arr, n, i)
    
    # Extract elements from heap one by one
    for i in range(n - 1, 0, -1):
        # Move current root to end
        arr[0], arr[i] = arr[i], arr[0]
        
        # Call heapify on reduced heap
        heapify(arr, i, 0)

def heapify(arr, n, i):
    largest = i      # Initialize largest as root
    left = 2 * i + 1     # Left child
    right = 2 * i + 2    # Right child
    
    # If left child exists and is greater than root
    if left < n and arr[left] > arr[largest]:
        largest = left
    
    # If right child exists and is greater than largest so far
    if right < n and arr[right] > arr[largest]:
        largest = right
    
    # If largest is not root
    if largest != i:
        arr[i], arr[largest] = arr[largest], arr[i]
        
        # Recursively heapify the affected subtree
        heapify(arr, n, largest)`;

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
                            Heap Sort Visualizer
                        </h1>
                        <p className="text-xl text-orange-100 mb-6 max-w-3xl mx-auto">
                            Watch how Heap Sort builds a binary max heap and repeatedly extracts the maximum element to create a sorted array.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Time: O(n log n)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(1)</div>
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
                                        Phase: {currentState.phase} | Heap Size: {currentState.heapSize}
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
                                <h3 className="text-lg font-semibold mb-3 text-gray-800">Array Representation</h3>
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
                            </div>

                            {/* Heap Tree Visualization */}
                            {heapTree.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-lg font-semibold mb-3 text-gray-800">Binary Heap Tree</h3>
                                    <div className="bg-gray-50 rounded-lg border-2 border-gray-200 p-4">
                                        {heapTree.map((level, levelIndex) => (
                                            <div
                                                key={levelIndex}
                                                className="flex justify-center items-center mb-4"
                                                style={{ marginLeft: `${(heapTree.length - levelIndex - 1) * 20}px`, marginRight: `${(heapTree.length - levelIndex - 1) * 20}px` }}
                                            >
                                                {level.map((node, nodeIndex) => (
                                                    <div
                                                        key={nodeIndex}
                                                        className={`w-12 h-12 rounded-full flex items-center justify-center mx-2 text-white font-bold text-sm transition-all duration-500 ${node.color.replace('bg-', 'bg-').replace('border-', 'border-2 border-')}`}
                                                    >
                                                        {node.value}
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Legend */}
                            <div className="flex flex-wrap justify-center gap-4 mb-6 text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-orange-400 border border-orange-500 rounded"></div>
                                    <span>Heap Elements</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-red-500 border border-red-600 rounded"></div>
                                    <span>Max Element</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-blue-500 border border-blue-600 rounded"></div>
                                    <span>Current Root</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-cyan-400 border border-cyan-500 rounded"></div>
                                    <span>Child Nodes</span>
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
                                    <div className="w-4 h-4 bg-gray-300 border border-gray-400 rounded"></div>
                                    <span>Outside Heap</span>
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
                                    <code className="bg-blue-100 text-blue-800 px-2 py-1 rounded">O(1)</code>
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
                            <h3 className="font-bold text-gray-900 mb-4">When to Use Heap Sort</h3>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li className="flex items-start gap-2">
                                    <span className="text-green-600 mt-1">✓</span>
                                    <span>Guaranteed O(n log n) time complexity needed</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-600 mt-1">✓</span>
                                    <span>Memory-constrained environments (O(1) space)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-600 mt-1">✓</span>
                                    <span>When worst-case performance matters</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-600 mt-1">✓</span>
                                    <span>Finding k largest/smallest elements</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-red-600 mt-1">✗</span>
                                    <span>When stability is required</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-red-600 mt-1">✗</span>
                                    <span>Small datasets (overhead of heap building)</span>
                                </li>
                            </ul>
                        </div>

                        {/* Real-world Applications */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="font-bold text-gray-900 mb-4">Real-world Applications</h3>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>Priority queues implementation</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>Operating system task scheduling</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>Graph algorithms (Dijkstra's, Prim's)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>Finding top K elements in large datasets</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>Memory-critical embedded systems</span>
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

export default HeapSortPage;