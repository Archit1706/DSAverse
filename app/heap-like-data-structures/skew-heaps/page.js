'use client';

import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, ArrowLeft, Plus, Minus, Eye, Shuffle } from 'lucide-react';

export default function SkewHeapsPage() {
    const [heap, setHeap] = useState(null);
    const [heap2, setHeap2] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(1500);
    const [inputValue, setInputValue] = useState('');
    const [mergeValue, setMergeValue] = useState('');
    const [nodeIdCounter, setNodeIdCounter] = useState(1);
    const [totalSwaps, setTotalSwaps] = useState(0);

    useEffect(() => {
        reset();
    }, []);

    const createNode = (value) => ({
        value,
        left: null,
        right: null,
        id: nodeIdCounter + Math.random()
    });

    // Merge two skew heaps - core operation
    const mergeHeaps = (h1, h2, steps = [], explanation = '') => {
        if (!h1) return h2;
        if (!h2) return h1;

        // Ensure h1 has smaller root
        if (h1.value > h2.value) {
            [h1, h2] = [h2, h1];
        }

        steps.push({
            heap: JSON.parse(JSON.stringify(h1)),
            heap2: JSON.parse(JSON.stringify(h2)),
            highlightNodes: [h1.id, h2 ? h2.id : null],
            explanation: `🔄 Merge: Compare roots ${h1.value} and ${h2.value}. Keep ${h1.value} as root.`,
            phase: 'compare',
            swapHappened: false
        });

        // Recursively merge h2 with right subtree of h1
        const tempRight = h1.right;
        h1.right = mergeHeaps(h2, h1.right, steps, 'recursive');

        steps.push({
            heap: JSON.parse(JSON.stringify(h1)),
            heap2: null,
            highlightNodes: [h1.id],
            explanation: `🔗 Merged ${h2.value} with right subtree of ${h1.value}`,
            phase: 'merge',
            swapHappened: false
        });

        // SWAP: Always swap left and right children (the "skew" part)
        [h1.left, h1.right] = [h1.right, h1.left];

        steps.push({
            heap: JSON.parse(JSON.stringify(h1)),
            heap2: null,
            highlightNodes: [h1.id],
            explanation: `↔️ SKEW: Swap left and right children of ${h1.value}`,
            phase: 'swap',
            swapHappened: true
        });

        return h1;
    };

    const generateSteps = (operation, value = null, mergeHeap = null) => {
        const steps = [];
        let currentHeap = heap ? JSON.parse(JSON.stringify(heap)) : null;

        if (operation === 'insert') {
            const newNode = createNode(value);

            steps.push({
                heap: currentHeap,
                heap2: newNode,
                highlightNodes: [newNode.id],
                explanation: `➕ Create new single-node heap with value ${value}`,
                phase: 'create',
                swapHappened: false
            });

            if (!currentHeap) {
                currentHeap = newNode;
                steps.push({
                    heap: currentHeap,
                    heap2: null,
                    highlightNodes: [newNode.id],
                    explanation: `✅ First node! Heap initialized with ${value}`,
                    phase: 'complete',
                    swapHappened: false
                });
            } else {
                steps.push({
                    heap: currentHeap,
                    heap2: newNode,
                    highlightNodes: [],
                    explanation: `🔀 Begin merge of main heap with new node ${value}`,
                    phase: 'prepare',
                    swapHappened: false
                });

                currentHeap = mergeHeaps(currentHeap, newNode, steps);

                steps.push({
                    heap: currentHeap,
                    heap2: null,
                    highlightNodes: [],
                    explanation: `✅ Insert complete! Node ${value} merged into heap`,
                    phase: 'complete',
                    swapHappened: false
                });
            }

        } else if (operation === 'extractMin') {
            if (!currentHeap) {
                steps.push({
                    heap: null,
                    heap2: null,
                    highlightNodes: [],
                    explanation: `❌ Heap is empty! Cannot extract minimum.`,
                    phase: 'error',
                    swapHappened: false
                });
                return steps;
            }

            const minValue = currentHeap.value;

            steps.push({
                heap: currentHeap,
                heap2: null,
                highlightNodes: [currentHeap.id],
                explanation: `🎯 Extract minimum: ${minValue} (root node)`,
                phase: 'identify',
                swapHappened: false
            });

            const leftSubtree = currentHeap.left;
            const rightSubtree = currentHeap.right;

            steps.push({
                heap: leftSubtree,
                heap2: rightSubtree,
                highlightNodes: [],
                explanation: `🗑️ Remove root ${minValue}. Left and right children become separate heaps`,
                phase: 'remove',
                swapHappened: false
            });

            if (!leftSubtree && !rightSubtree) {
                currentHeap = null;
                steps.push({
                    heap: null,
                    heap2: null,
                    highlightNodes: [],
                    explanation: `✅ Extracted ${minValue}. Heap is now empty`,
                    phase: 'complete',
                    swapHappened: false
                });
            } else if (!leftSubtree) {
                currentHeap = rightSubtree;
                steps.push({
                    heap: currentHeap,
                    heap2: null,
                    highlightNodes: [],
                    explanation: `✅ Extracted ${minValue}. Right child becomes new root`,
                    phase: 'complete',
                    swapHappened: false
                });
            } else if (!rightSubtree) {
                currentHeap = leftSubtree;
                steps.push({
                    heap: currentHeap,
                    heap2: null,
                    highlightNodes: [],
                    explanation: `✅ Extracted ${minValue}. Left child becomes new root`,
                    phase: 'complete',
                    swapHappened: false
                });
            } else {
                steps.push({
                    heap: leftSubtree,
                    heap2: rightSubtree,
                    highlightNodes: [],
                    explanation: `🔀 Merge left and right subtrees`,
                    phase: 'merging',
                    swapHappened: false
                });

                currentHeap = mergeHeaps(leftSubtree, rightSubtree, steps);

                steps.push({
                    heap: currentHeap,
                    heap2: null,
                    highlightNodes: [],
                    explanation: `✅ Extracted ${minValue}. Subtrees merged successfully`,
                    phase: 'complete',
                    swapHappened: false
                });
            }

        } else if (operation === 'merge') {
            if (!currentHeap && !mergeHeap) {
                steps.push({
                    heap: null,
                    heap2: null,
                    highlightNodes: [],
                    explanation: `❌ Both heaps are empty!`,
                    phase: 'error',
                    swapHappened: false
                });
                return steps;
            }

            if (!currentHeap) {
                steps.push({
                    heap: mergeHeap,
                    heap2: null,
                    highlightNodes: [],
                    explanation: `✅ Main heap is empty. Result is the second heap`,
                    phase: 'complete',
                    swapHappened: false
                });
                return steps;
            }

            if (!mergeHeap) {
                steps.push({
                    heap: currentHeap,
                    heap2: null,
                    highlightNodes: [],
                    explanation: `✅ Second heap is empty. Result is the main heap`,
                    phase: 'complete',
                    swapHappened: false
                });
                return steps;
            }

            steps.push({
                heap: currentHeap,
                heap2: mergeHeap,
                highlightNodes: [],
                explanation: `🔀 Begin merging two skew heaps`,
                phase: 'prepare',
                swapHappened: false
            });

            currentHeap = mergeHeaps(currentHeap, mergeHeap, steps);

            steps.push({
                heap: currentHeap,
                heap2: null,
                highlightNodes: [],
                explanation: `✅ Merge complete! All nodes combined into single heap`,
                phase: 'complete',
                swapHappened: false
            });

        } else if (operation === 'findMin') {
            if (!currentHeap) {
                steps.push({
                    heap: null,
                    heap2: null,
                    highlightNodes: [],
                    explanation: `❌ Heap is empty!`,
                    phase: 'error',
                    swapHappened: false
                });
            } else {
                steps.push({
                    heap: currentHeap,
                    heap2: null,
                    highlightNodes: [currentHeap.id],
                    explanation: `👀 Minimum value: ${currentHeap.value} (at root)`,
                    phase: 'complete',
                    swapHappened: false
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
        setNodeIdCounter(prev => prev + 1);
    };

    const handleExtractMin = () => {
        const steps = generateSteps('extractMin');
        setStepHistory(steps);
        setCurrentStep(0);
    };

    const handleMerge = () => {
        if (!mergeValue) return;
        const values = mergeValue.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v));
        if (values.length === 0) return;

        // Create a heap from the values
        let newHeap = null;
        for (const val of values) {
            const node = createNode(val);
            if (!newHeap) {
                newHeap = node;
            } else {
                newHeap = mergeHeaps(newHeap, node, []);
            }
            setNodeIdCounter(prev => prev + 1);
        }

        const steps = generateSteps('merge', null, newHeap);
        setStepHistory(steps);
        setCurrentStep(0);
        setMergeValue('');
    };

    const handleFindMin = () => {
        const steps = generateSteps('findMin');
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
        setHeap(null);
        setHeap2(null);
        setStepHistory([]);
        setCurrentStep(0);
        setIsPlaying(false);
        setTotalSwaps(0);
    };

    const currentState = stepHistory[currentStep] || {
        heap: heap,
        heap2: heap2,
        highlightNodes: [],
        explanation: 'Select an operation to begin visualization',
        phase: '',
        swapHappened: false
    };

    // Count swaps in current visualization
    useEffect(() => {
        const swapCount = stepHistory.filter(step => step.swapHappened).length;
        setTotalSwaps(swapCount);
    }, [stepHistory]);

    const renderSkewHeap = (node, x, y, level = 0, isSecondHeap = false) => {
        if (!node) return [];

        const elements = [];
        const nodeRadius = 20;
        const horizontalSpacing = Math.max(200 / Math.pow(2, level), 30);
        const verticalSpacing = 70;

        const isHighlighted = currentState.highlightNodes.includes(node.id);
        const nodeColor = isHighlighted
            ? 'fill-yellow-400 stroke-yellow-600 animate-pulse'
            : isSecondHeap
                ? 'fill-orange-300 stroke-orange-500'
                : 'fill-amber-400 stroke-amber-600';

        // Draw edges to children
        if (node.left) {
            const leftX = x - horizontalSpacing;
            const leftY = y + verticalSpacing;
            elements.push(
                <line
                    key={`edge-left-${node.id}`}
                    x1={x}
                    y1={y + nodeRadius}
                    x2={leftX}
                    y2={leftY - nodeRadius}
                    className="stroke-amber-400 stroke-2"
                />
            );
            elements.push(...renderSkewHeap(node.left, leftX, leftY, level + 1, isSecondHeap));
        }

        if (node.right) {
            const rightX = x + horizontalSpacing;
            const rightY = y + verticalSpacing;
            elements.push(
                <line
                    key={`edge-right-${node.id}`}
                    x1={x}
                    y1={y + nodeRadius}
                    x2={rightX}
                    y2={rightY - nodeRadius}
                    className="stroke-amber-400 stroke-2"
                />
            );
            elements.push(...renderSkewHeap(node.right, rightX, rightY, level + 1, isSecondHeap));
        }

        // Draw node
        elements.push(
            <g key={`node-${node.id}`}>
                <circle
                    cx={x}
                    cy={y}
                    r={nodeRadius}
                    className={`${nodeColor} stroke-2 transition-all duration-300`}
                />
                <text
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-sm font-bold fill-gray-800"
                >
                    {node.value}
                </text>
            </g>
        );

        return elements;
    };

    const renderVisualization = () => {
        if (!currentState.heap && !currentState.heap2) {
            return (
                <div className="flex items-center justify-center h-64 text-gray-400">
                    <div className="text-center">
                        <div className="text-4xl mb-2">🌳</div>
                        <div>Empty Skew Heap</div>
                    </div>
                </div>
            );
        }

        const width = currentState.heap2 ? 1000 : 600;
        const height = 400;

        return (
            <svg width={width} height={height} className="mx-auto">
                {/* Main heap */}
                {currentState.heap && (
                    <>
                        <text x={currentState.heap2 ? 200 : 300} y={30} textAnchor="middle" className="text-sm font-bold fill-amber-700">
                            {currentState.heap2 ? 'Heap 1' : 'Main Heap'}
                        </text>
                        {renderSkewHeap(currentState.heap, currentState.heap2 ? 200 : 300, 60)}
                    </>
                )}

                {/* Second heap (during merge) */}
                {currentState.heap2 && (
                    <>
                        <text x={650} y={30} textAnchor="middle" className="text-sm font-bold fill-orange-600">
                            Heap 2
                        </text>
                        {renderSkewHeap(currentState.heap2, 650, 60, 0, true)}

                        {/* Merge arrow */}
                        <g>
                            <line x1={400} y1={200} x2={500} y2={200} className="stroke-amber-600 stroke-2" markerEnd="url(#arrowhead)" />
                            <text x={450} y={190} textAnchor="middle" className="text-xs fill-amber-700 font-semibold">
                                MERGE
                            </text>
                        </g>

                        <defs>
                            <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                                <polygon points="0 0, 10 3, 0 6" fill="#d97706" />
                            </marker>
                        </defs>
                    </>
                )}
            </svg>
        );
    };

    const countNodes = (node) => {
        if (!node) return 0;
        return 1 + countNodes(node.left) + countNodes(node.right);
    };

    const getHeight = (node) => {
        if (!node) return 0;
        return 1 + Math.max(getHeight(node.left), getHeight(node.right));
    };

    const codeExample = `class SkewHeapNode:
    def __init__(self, value):
        self.value = value
        self.left = None
        self.right = None

class SkewHeap:
    def __init__(self):
        self.root = None
    
    def merge(self, h1, h2):
        """
        Merge two skew heaps - O(log n) amortized
        Key: Always swap left and right children after merge
        """
        # Base cases
        if h1 is None:
            return h2
        if h2 is None:
            return h1
        
        # Ensure h1 has smaller root (min-heap property)
        if h1.value > h2.value:
            h1, h2 = h2, h1
        
        # Recursively merge h2 with right subtree of h1
        h1.right = self.merge(h2, h1.right)
        
        # SKEW: Always swap left and right children
        # This is what makes it "skew" and self-adjusting!
        h1.left, h1.right = h1.right, h1.left
        
        return h1
    
    def insert(self, value):
        """Insert a value - O(log n) amortized"""
        new_node = SkewHeapNode(value)
        self.root = self.merge(self.root, new_node)
    
    def extract_min(self):
        """Remove and return minimum - O(log n) amortized"""
        if self.root is None:
            return None
        
        # Save minimum value
        min_value = self.root.value
        
        # Merge left and right subtrees
        self.root = self.merge(self.root.left, self.root.right)
        
        return min_value
    
    def find_min(self):
        """Find minimum value - O(1)"""
        return self.root.value if self.root else None
    
    def is_empty(self):
        return self.root is None
    
    def merge_with(self, other_heap):
        """Merge with another skew heap - O(log n) amortized"""
        self.root = self.merge(self.root, other_heap.root)
        other_heap.root = None  # Other heap becomes empty

# Example usage demonstrating the simplicity
heap = SkewHeap()

# Insert elements
for value in [15, 10, 20, 8, 25]:
    heap.insert(value)

# Extract minimum
min_val = heap.extract_min()  # Returns 8

# Merge two heaps
heap2 = SkewHeap()
heap2.insert(5)
heap2.insert(12)
heap.merge_with(heap2)  # Combine heaps`;

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-600 to-orange-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex items-center mb-6">
                        <a href="/heap-like-data-structures" className="flex items-center text-white hover:text-amber-200 transition-colors mr-4">
                            <ArrowLeft className="h-5 w-5 mr-2" />
                            Back to Heap Data Structures
                        </a>
                    </div>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">
                            Skew Heap Visualization
                        </h1>
                        <p className="text-xl text-amber-100 mb-6 max-w-3xl mx-auto">
                            Self-adjusting binary heap that unconditionally swaps children during merge. Simpler than leftist heaps with comparable amortized performance!
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                                <Play className="h-4 w-4" />
                                Self-Adjusting Structure
                            </div>
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                                <Shuffle className="h-4 w-4" />
                                Unconditional Swapping
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
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Skew Heap Visualization</h2>

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
                                    onClick={handleExtractMin}
                                    disabled={isPlaying}
                                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md flex items-center gap-2 disabled:opacity-50"
                                >
                                    <Minus className="h-4 w-4" />
                                    Extract Min
                                </button>
                                <button
                                    onClick={handleFindMin}
                                    disabled={isPlaying}
                                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md flex items-center gap-2"
                                >
                                    <Eye className="h-4 w-4" />
                                    Find Min
                                </button>
                            </div>

                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={mergeValue}
                                    onChange={(e) => setMergeValue(e.target.value)}
                                    placeholder="Values to merge (e.g., 5,12,8)"
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
                                />
                                <button
                                    onClick={handleMerge}
                                    disabled={isPlaying}
                                    className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-md flex items-center gap-2 disabled:opacity-50"
                                >
                                    <Shuffle className="h-4 w-4" />
                                    Merge
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
                                    <option value={2500}>Slow</option>
                                    <option value={1500}>Normal</option>
                                    <option value={800}>Fast</option>
                                </select>
                            </div>
                        </div>

                        {/* Tree Visualization */}
                        <div className="mb-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-4 overflow-x-auto">
                            {renderVisualization()}
                        </div>

                        {/* Heap Statistics */}
                        <div className="mb-6 grid grid-cols-3 gap-4">
                            <div className="bg-amber-50 rounded-lg p-3 text-center">
                                <div className="text-sm text-gray-600">Nodes</div>
                                <div className="text-2xl font-bold text-amber-600">
                                    {countNodes(currentState.heap)}
                                </div>
                            </div>
                            <div className="bg-amber-50 rounded-lg p-3 text-center">
                                <div className="text-sm text-gray-600">Height</div>
                                <div className="text-2xl font-bold text-amber-600">
                                    {getHeight(currentState.heap)}
                                </div>
                            </div>
                            <div className="bg-amber-50 rounded-lg p-3 text-center">
                                <div className="text-sm text-gray-600">Swaps</div>
                                <div className="text-2xl font-bold text-amber-600">
                                    {totalSwaps}
                                </div>
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
                            {currentState.swapHappened && (
                                <div className="mt-2 text-sm text-orange-600 font-semibold">
                                    ↔️ Children swapped (skewing)
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
                                        <div className="text-xl font-bold text-green-600">O(log n)*</div>
                                        <div className="text-sm text-gray-600">Insert</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xl font-bold text-green-600">O(log n)*</div>
                                        <div className="text-sm text-gray-600">Extract Min</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xl font-bold text-green-600">O(1)</div>
                                        <div className="text-sm text-gray-600">Find Min</div>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="text-lg font-bold text-green-600">O(log n)* Merge</div>
                                    <div className="text-sm text-gray-600">Efficient heap union</div>
                                </div>
                                <div className="text-xs text-gray-500 text-center">
                                    *Amortized time complexity
                                </div>
                            </div>
                        </div>

                        {/* Skew Heap Properties */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Skew Heap Properties</h2>
                            <div className="space-y-3 text-sm text-gray-600">
                                <div>• <strong>Self-Adjusting:</strong> Structure changes with each operation</div>
                                <div>• <strong>Unconditional Swap:</strong> Always swap left/right during merge</div>
                                <div>• <strong>No Invariants:</strong> No null path length or rank to maintain</div>
                                <div>• <strong>Min-Heap Property:</strong> Parent ≤ both children</div>
                                <div>• <strong>Simpler:</strong> Easier to implement than leftist heaps</div>
                                <div>• <strong>Amortized Efficiency:</strong> O(log n) for merge operations</div>
                            </div>
                        </div>

                        {/* The Skewing Process */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">The Skewing Process</h2>
                            <div className="space-y-3 text-sm text-gray-600">
                                <div className="border-l-4 border-amber-500 pl-3">
                                    <strong>Step 1:</strong> Compare roots, keep smaller as new root
                                </div>
                                <div className="border-l-4 border-amber-500 pl-3">
                                    <strong>Step 2:</strong> Recursively merge larger root with right subtree
                                </div>
                                <div className="border-l-4 border-orange-500 pl-3">
                                    <strong>Step 3:</strong> SWAP left and right children (always!)
                                </div>
                                <div className="mt-4 p-3 bg-amber-50 rounded-lg">
                                    <p className="text-xs">
                                        <strong>Key Insight:</strong> The unconditional swapping balances the tree
                                        over time, ensuring amortized O(log n) performance without maintaining
                                        explicit balance information.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* vs Leftist Heaps */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">vs Leftist Heaps</h2>
                            <div className="space-y-3 text-sm text-gray-600">
                                <div className="flex items-start">
                                    <span className="w-2 h-2 bg-green-400 rounded-full mr-3 mt-2"></span>
                                    <div>
                                        <strong>Simpler:</strong> No null path length to maintain
                                    </div>
                                </div>
                                <div className="flex items-start">
                                    <span className="w-2 h-2 bg-green-400 rounded-full mr-3 mt-2"></span>
                                    <div>
                                        <strong>Less Memory:</strong> No extra data per node
                                    </div>
                                </div>
                                <div className="flex items-start">
                                    <span className="w-2 h-2 bg-green-400 rounded-full mr-3 mt-2"></span>
                                    <div>
                                        <strong>Unconditional:</strong> Always swap, no comparisons needed
                                    </div>
                                </div>
                                <div className="flex items-start">
                                    <span className="w-2 h-2 bg-amber-400 rounded-full mr-3 mt-2"></span>
                                    <div>
                                        <strong>Amortized:</strong> Same O(log n) complexity but amortized
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Applications */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Applications</h2>
                            <div className="space-y-3 text-sm text-gray-600">
                                <div>• <strong>Simple Priority Queues:</strong> When simplicity matters more than worst-case</div>
                                <div>• <strong>Educational:</strong> Teaching heap concepts without complexity</div>
                                <div>• <strong>Mergeable Heaps:</strong> When frequent merging is needed</div>
                                <div>• <strong>Functional Programming:</strong> Easier to implement functionally</div>
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