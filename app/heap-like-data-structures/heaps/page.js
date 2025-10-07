'use client';

import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, ArrowLeft, Plus, Minus, Eye, Trash2 } from 'lucide-react';

export default function HeapsPage() {
    const [heap, setHeap] = useState([]);
    const [heapType, setHeapType] = useState('max'); // 'max' or 'min'
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(1000);
    const [inputValue, setInputValue] = useState('');

    useEffect(() => {
        reset();
    }, []);

    const generateSteps = (operation, value = null) => {
        const steps = [];
        const currentHeap = [...heap];

        if (operation === 'insert') {
            // Step 1: Add element at the end
            currentHeap.push(value);
            steps.push({
                heap: [...currentHeap],
                highlightIndices: [currentHeap.length - 1],
                operation: 'insert',
                value: value,
                explanation: `➕ Insert ${value} at the end of heap (index ${currentHeap.length - 1})`,
                phase: 'add',
                swapIndices: []
            });

            // Step 2-n: Heapify up (bubble up)
            let currentIndex = currentHeap.length - 1;
            while (currentIndex > 0) {
                const parentIndex = Math.floor((currentIndex - 1) / 2);
                const shouldSwap = heapType === 'max'
                    ? currentHeap[currentIndex] > currentHeap[parentIndex]
                    : currentHeap[currentIndex] < currentHeap[parentIndex];

                if (shouldSwap) {
                    steps.push({
                        heap: [...currentHeap],
                        highlightIndices: [currentIndex, parentIndex],
                        operation: 'insert',
                        value: value,
                        explanation: `🔄 Compare ${currentHeap[currentIndex]} with parent ${currentHeap[parentIndex]}. Swap needed!`,
                        phase: 'compare',
                        swapIndices: [currentIndex, parentIndex]
                    });

                    // Perform swap
                    [currentHeap[currentIndex], currentHeap[parentIndex]] =
                        [currentHeap[parentIndex], currentHeap[currentIndex]];

                    steps.push({
                        heap: [...currentHeap],
                        highlightIndices: [parentIndex],
                        operation: 'insert',
                        value: value,
                        explanation: `✅ Swapped! ${value} moved to index ${parentIndex}`,
                        phase: 'swap',
                        swapIndices: []
                    });

                    currentIndex = parentIndex;
                } else {
                    steps.push({
                        heap: [...currentHeap],
                        highlightIndices: [currentIndex],
                        operation: 'insert',
                        value: value,
                        explanation: `✅ Heap property satisfied! ${currentHeap[currentIndex]} is in correct position`,
                        phase: 'complete',
                        swapIndices: []
                    });
                    break;
                }
            }

            if (currentIndex === 0) {
                steps.push({
                    heap: [...currentHeap],
                    highlightIndices: [0],
                    operation: 'insert',
                    value: value,
                    explanation: `🎯 ${value} reached the root! Insertion complete.`,
                    phase: 'complete',
                    swapIndices: []
                });
            }

        } else if (operation === 'extractRoot') {
            if (currentHeap.length === 0) {
                steps.push({
                    heap: [...currentHeap],
                    highlightIndices: [],
                    operation: 'extractRoot',
                    value: null,
                    explanation: `❌ Heap is empty! Cannot extract root.`,
                    phase: 'error',
                    swapIndices: []
                });
                return steps;
            }

            const rootValue = currentHeap[0];

            // Step 1: Identify root
            steps.push({
                heap: [...currentHeap],
                highlightIndices: [0],
                operation: 'extractRoot',
                value: rootValue,
                explanation: `🎯 Extract root: ${rootValue}`,
                phase: 'identify',
                swapIndices: []
            });

            if (currentHeap.length === 1) {
                currentHeap.pop();
                steps.push({
                    heap: [...currentHeap],
                    highlightIndices: [],
                    operation: 'extractRoot',
                    value: rootValue,
                    explanation: `✅ Removed root ${rootValue}. Heap is now empty.`,
                    phase: 'complete',
                    swapIndices: []
                });
                return steps;
            }

            // Step 2: Replace root with last element
            currentHeap[0] = currentHeap[currentHeap.length - 1];
            currentHeap.pop();

            steps.push({
                heap: [...currentHeap],
                highlightIndices: [0],
                operation: 'extractRoot',
                value: rootValue,
                explanation: `🔄 Replace root with last element (${currentHeap[0]}). Now heapify down!`,
                phase: 'replace',
                swapIndices: []
            });

            // Step 3-n: Heapify down (bubble down)
            let currentIndex = 0;
            while (true) {
                const leftChildIndex = 2 * currentIndex + 1;
                const rightChildIndex = 2 * currentIndex + 2;
                let targetIndex = currentIndex;

                if (leftChildIndex < currentHeap.length) {
                    const shouldSwapLeft = heapType === 'max'
                        ? currentHeap[leftChildIndex] > currentHeap[targetIndex]
                        : currentHeap[leftChildIndex] < currentHeap[targetIndex];

                    if (shouldSwapLeft) {
                        targetIndex = leftChildIndex;
                    }
                }

                if (rightChildIndex < currentHeap.length) {
                    const shouldSwapRight = heapType === 'max'
                        ? currentHeap[rightChildIndex] > currentHeap[targetIndex]
                        : currentHeap[rightChildIndex] < currentHeap[targetIndex];

                    if (shouldSwapRight) {
                        targetIndex = rightChildIndex;
                    }
                }

                if (targetIndex === currentIndex) {
                    steps.push({
                        heap: [...currentHeap],
                        highlightIndices: [currentIndex],
                        operation: 'extractRoot',
                        value: rootValue,
                        explanation: `✅ Heap property restored! Extraction complete. Removed ${rootValue}.`,
                        phase: 'complete',
                        swapIndices: []
                    });
                    break;
                }

                const highlightIndices = [currentIndex, targetIndex];
                if (leftChildIndex < currentHeap.length) highlightIndices.push(leftChildIndex);
                if (rightChildIndex < currentHeap.length) highlightIndices.push(rightChildIndex);

                steps.push({
                    heap: [...currentHeap],
                    highlightIndices: highlightIndices,
                    operation: 'extractRoot',
                    value: rootValue,
                    explanation: `🔍 Compare ${currentHeap[currentIndex]} with children. Swap with ${currentHeap[targetIndex]}`,
                    phase: 'compare',
                    swapIndices: [currentIndex, targetIndex]
                });

                // Perform swap
                [currentHeap[currentIndex], currentHeap[targetIndex]] =
                    [currentHeap[targetIndex], currentHeap[currentIndex]];

                steps.push({
                    heap: [...currentHeap],
                    highlightIndices: [targetIndex],
                    operation: 'extractRoot',
                    value: rootValue,
                    explanation: `✅ Swapped! Continue heapify down...`,
                    phase: 'swap',
                    swapIndices: []
                });

                currentIndex = targetIndex;
            }

        } else if (operation === 'peek') {
            if (currentHeap.length === 0) {
                steps.push({
                    heap: [...currentHeap],
                    highlightIndices: [],
                    operation: 'peek',
                    value: null,
                    explanation: `❌ Heap is empty!`,
                    phase: 'error',
                    swapIndices: []
                });
            } else {
                steps.push({
                    heap: [...currentHeap],
                    highlightIndices: [0],
                    operation: 'peek',
                    value: currentHeap[0],
                    explanation: `👀 Root value: ${currentHeap[0]}`,
                    phase: 'complete',
                    swapIndices: []
                });
            }
        }

        return steps;
    };

    const handleInsert = () => {
        if (!inputValue || isNaN(inputValue)) return;
        const value = parseInt(inputValue);
        const steps = generateSteps('insert', value);
        setStepHistory(steps);
        setCurrentStep(0);
        setInputValue('');
    };

    const handleExtractRoot = () => {
        const steps = generateSteps('extractRoot');
        setStepHistory(steps);
        setCurrentStep(0);
    };

    const handlePeek = () => {
        const steps = generateSteps('peek');
        setStepHistory(steps);
        setCurrentStep(0);
    };

    const playAnimation = () => {
        if (stepHistory.length === 0) return;
        setIsPlaying(true);

        const interval = setInterval(() => {
            setCurrentStep(prev => {
                if (prev >= stepHistory.length - 1) {
                    setIsPlaying(false);
                    clearInterval(interval);
                    if (stepHistory[stepHistory.length - 1]) {
                        setHeap(stepHistory[stepHistory.length - 1].heap);
                    }
                    return prev;
                }
                return prev + 1;
            });
        }, speed);
    };

    const pauseAnimation = () => {
        setIsPlaying(false);
    };

    const reset = () => {
        setHeap([]);
        setStepHistory([]);
        setCurrentStep(0);
        setIsPlaying(false);
    };

    const currentState = stepHistory[currentStep] || {
        heap: heap,
        highlightIndices: [],
        operation: '',
        value: null,
        explanation: 'Select an operation to begin visualization',
        phase: '',
        swapIndices: []
    };

    const renderHeapTree = () => {
        if (currentState.heap.length === 0) {
            return (
                <div className="flex items-center justify-center h-64 text-gray-400">
                    <div className="text-center">
                        <div className="text-4xl mb-2">🌳</div>
                        <div>Empty Heap</div>
                    </div>
                </div>
            );
        }

        const levels = Math.ceil(Math.log2(currentState.heap.length + 1));
        const width = 800;
        const height = levels * 80 + 40;
        const nodeRadius = 20;

        const getNodePosition = (index) => {
            const level = Math.floor(Math.log2(index + 1));
            const positionInLevel = index - (Math.pow(2, level) - 1);
            const totalNodesInLevel = Math.pow(2, level);

            const x = ((positionInLevel + 0.5) / totalNodesInLevel) * width;
            const y = level * 80 + 40;

            return { x, y };
        };

        const getNodeColor = (index) => {
            if (currentState.highlightIndices.includes(index)) {
                if (currentState.phase === 'error') return 'fill-red-400 stroke-red-600';
                if (currentState.phase === 'compare') return 'fill-yellow-400 stroke-yellow-600 animate-pulse';
                if (currentState.phase === 'complete') return 'fill-green-400 stroke-green-600 animate-pulse';
                return 'fill-amber-400 stroke-amber-600 animate-pulse';
            }
            return 'fill-amber-300 stroke-amber-500';
        };

        return (
            <svg width={width} height={height} className="mx-auto">
                {/* Draw edges first */}
                {currentState.heap.map((_, index) => {
                    if (index === 0) return null;
                    const parentIndex = Math.floor((index - 1) / 2);
                    const childPos = getNodePosition(index);
                    const parentPos = getNodePosition(parentIndex);

                    const isSwapping = currentState.swapIndices.includes(index) &&
                        currentState.swapIndices.includes(parentIndex);

                    return (
                        <line
                            key={`edge-${index}`}
                            x1={parentPos.x}
                            y1={parentPos.y}
                            x2={childPos.x}
                            y2={childPos.y}
                            className={isSwapping ? "stroke-amber-600 stroke-2 animate-pulse" : "stroke-amber-400 stroke-2"}
                        />
                    );
                })}

                {/* Draw nodes */}
                {currentState.heap.map((value, index) => {
                    const pos = getNodePosition(index);
                    return (
                        <g key={`node-${index}`}>
                            <circle
                                cx={pos.x}
                                cy={pos.y}
                                r={nodeRadius}
                                className={`${getNodeColor(index)} stroke-2 transition-all duration-300`}
                            />
                            <text
                                x={pos.x}
                                y={pos.y}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                className="text-sm font-bold fill-gray-800"
                            >
                                {value}
                            </text>
                            <text
                                x={pos.x}
                                y={pos.y + nodeRadius + 12}
                                textAnchor="middle"
                                className="text-xs fill-gray-600"
                            >
                                [{index}]
                            </text>
                        </g>
                    );
                })}
            </svg>
        );
    };

    const codeExample = `class ${heapType === 'max' ? 'MaxHeap' : 'MinHeap'}:
    def __init__(self):
        self.heap = []
    
    def parent(self, i):
        return (i - 1) // 2
    
    def left_child(self, i):
        return 2 * i + 1
    
    def right_child(self, i):
        return 2 * i + 2
    
    def insert(self, value):
        # Add element at the end
        self.heap.append(value)
        
        # Heapify up
        current = len(self.heap) - 1
        while current > 0:
            parent = self.parent(current)
            ${heapType === 'max' ?
            `if self.heap[current] > self.heap[parent]:` :
            `if self.heap[current] < self.heap[parent]:`}
                # Swap with parent
                self.heap[current], self.heap[parent] = \\
                    self.heap[parent], self.heap[current]
                current = parent
            else:
                break
    
    def extract_root(self):
        if not self.heap:
            return None
        
        # Save root value
        root = self.heap[0]
        
        # Move last element to root
        self.heap[0] = self.heap[-1]
        self.heap.pop()
        
        # Heapify down
        self._heapify_down(0)
        
        return root
    
    def _heapify_down(self, i):
        size = len(self.heap)
        while True:
            ${heapType === 'max' ? 'largest' : 'smallest'} = i
            left = self.left_child(i)
            right = self.right_child(i)
            
            if left < size:
                ${heapType === 'max' ?
            `if self.heap[left] > self.heap[largest]:
                    largest = left` :
            `if self.heap[left] < self.heap[smallest]:
                    smallest = left`}
            
            if right < size:
                ${heapType === 'max' ?
            `if self.heap[right] > self.heap[largest]:
                    largest = right` :
            `if self.heap[right] < self.heap[smallest]:
                    smallest = right`}
            
            if ${heapType === 'max' ? 'largest' : 'smallest'} == i:
                break
            
            # Swap with ${heapType === 'max' ? 'largest' : 'smallest'} child
            self.heap[i], self.heap[${heapType === 'max' ? 'largest' : 'smallest'}] = \\
                self.heap[${heapType === 'max' ? 'largest' : 'smallest'}], self.heap[i]
            i = ${heapType === 'max' ? 'largest' : 'smallest'}
    
    def peek(self):
        return self.heap[0] if self.heap else None
    
    def size(self):
        return len(self.heap)`;

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex items-center mb-6">
                        <a href="/heap-like-data-structures" className="flex items-center text-white hover:text-amber-200 transition-colors mr-4">
                            <ArrowLeft className="h-5 w-5 mr-2" />
                            Back to Heap Data Structures
                        </a>
                    </div>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">
                            Binary Heap Visualization
                        </h1>
                        <p className="text-xl text-amber-100 mb-6 max-w-3xl mx-auto">
                            Explore the complete binary tree with heap property: parent nodes are always greater (max-heap) or smaller (min-heap) than their children.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                                <Play className="h-4 w-4" />
                                Interactive Heap Operations
                            </div>
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                                🌳 Tree & Array View
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Visualization Panel */}
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-800">Heap Visualization</h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setHeapType('max')}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${heapType === 'max'
                                            ? 'bg-amber-500 text-white'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                >
                                    Max Heap
                                </button>
                                <button
                                    onClick={() => setHeapType('min')}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${heapType === 'min'
                                            ? 'bg-amber-500 text-white'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                >
                                    Min Heap
                                </button>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="mb-6 space-y-4">
                            <div className="flex flex-wrap gap-2">
                                <input
                                    type="number"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder="Enter value"
                                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
                                />
                                <button
                                    onClick={handleInsert}
                                    disabled={isPlaying}
                                    className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-md flex items-center gap-2 disabled:opacity-50"
                                >
                                    <Plus className="h-4 w-4" />
                                    Insert
                                </button>
                                <button
                                    onClick={handleExtractRoot}
                                    disabled={isPlaying}
                                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md flex items-center gap-2 disabled:opacity-50"
                                >
                                    <Minus className="h-4 w-4" />
                                    Extract {heapType === 'max' ? 'Max' : 'Min'}
                                </button>
                                <button
                                    onClick={handlePeek}
                                    disabled={isPlaying}
                                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md flex items-center gap-2"
                                >
                                    <Eye className="h-4 w-4" />
                                    Peek
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={isPlaying ? pauseAnimation : playAnimation}
                                    disabled={stepHistory.length === 0}
                                    className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-md flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                    {isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button
                                    onClick={reset}
                                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md flex items-center gap-2"
                                >
                                    <RotateCcw className="h-4 w-4" />
                                    Reset
                                </button>
                            </div>

                            <div className="flex items-center gap-4">
                                <label className="text-sm font-medium text-gray-700">Speed:</label>
                                <select
                                    value={speed}
                                    onChange={(e) => setSpeed(Number(e.target.value))}
                                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                                >
                                    <option value={2000}>Slow</option>
                                    <option value={1000}>Normal</option>
                                    <option value={500}>Fast</option>
                                </select>
                            </div>
                        </div>

                        {/* Tree Visualization */}
                        <div className="mb-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-4 overflow-x-auto">
                            {renderHeapTree()}
                        </div>

                        {/* Array Representation */}
                        <div className="mb-6">
                            <h3 className="text-sm font-semibold text-gray-700 mb-2">Array Representation:</h3>
                            <div className="flex flex-wrap gap-2">
                                {currentState.heap.map((value, index) => (
                                    <div
                                        key={index}
                                        className={`w-12 h-12 flex flex-col items-center justify-center rounded border-2 transition-all duration-300 ${currentState.highlightIndices.includes(index)
                                                ? 'bg-amber-400 border-amber-600 scale-110 shadow-lg'
                                                : 'bg-amber-100 border-amber-300'
                                            }`}
                                    >
                                        <div className="text-sm font-bold text-gray-800">{value}</div>
                                        <div className="text-xs text-gray-600">[{index}]</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Step Explanation */}
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                            <h3 className="font-semibold text-amber-800 mb-2">Current Step:</h3>
                            <p className="text-amber-700">{currentState.explanation}</p>
                            {stepHistory.length > 0 && (
                                <div className="mt-2 text-sm text-amber-600">
                                    Step {currentStep + 1} of {stepHistory.length}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Information Panel */}
                    <div className="space-y-6">
                        {/* Complexity Analysis */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Complexity Analysis</h2>
                            <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="text-center">
                                        <div className="text-xl font-bold text-green-600">O(log n)</div>
                                        <div className="text-sm text-gray-600">Insert</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xl font-bold text-green-600">O(log n)</div>
                                        <div className="text-sm text-gray-600">Extract</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xl font-bold text-green-600">O(1)</div>
                                        <div className="text-sm text-gray-600">Peek</div>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="text-lg font-bold text-amber-600">O(n) Space</div>
                                    <div className="text-sm text-gray-600">Array-based storage</div>
                                </div>
                            </div>
                        </div>

                        {/* Heap Properties */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Heap Properties</h2>
                            <div className="space-y-3 text-sm text-gray-600">
                                <div>• <strong>Complete Binary Tree:</strong> All levels filled except possibly the last</div>
                                <div>• <strong>Heap Property:</strong> {heapType === 'max' ? 'Parent ≥ Children' : 'Parent ≤ Children'}</div>
                                <div>• <strong>Array Implementation:</strong> Left child at 2i+1, Right child at 2i+2</div>
                                <div>• <strong>Parent Formula:</strong> Parent at ⌊(i-1)/2⌋</div>
                                <div>• <strong>Height:</strong> O(log n) for n elements</div>
                            </div>
                        </div>

                        {/* Real-world Applications */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Applications</h2>
                            <div className="space-y-3 text-sm text-gray-600">
                                <div>• <strong>Priority Queues:</strong> Task scheduling with priorities</div>
                                <div>• <strong>Heap Sort:</strong> Efficient O(n log n) sorting algorithm</div>
                                <div>• <strong>Dijkstra's Algorithm:</strong> Finding shortest paths in graphs</div>
                                <div>• <strong>Median Finding:</strong> Using min-heap and max-heap together</div>
                                <div>• <strong>K-way Merge:</strong> Merging k sorted arrays efficiently</div>
                            </div>
                        </div>

                        {/* Code Example */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Implementation</h2>
                            <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
                                <code>{codeExample}</code>
                            </pre>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}