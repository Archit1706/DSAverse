'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, ArrowLeft, Plus, Minus, Eye } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

export default function BinomialQueuesPage() {
    const [trees, setTrees] = useState([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepHistory, setStepHistory] = useState([]);
    const [speed, setSpeed] = useState(1500);
    const [inputValue, setInputValue] = useState('');

    useEffect(() => {
        reset();
    }, []);

    // Helper to create a new binomial tree node
    const createNode = (value, rank = 0) => ({
        value,
        rank,
        children: [],
        id: Math.random()
    });

    // Merge two binomial trees of the same rank
    const mergeTrees = (t1, t2) => {
        if (t1.value <= t2.value) {
            return {
                ...t1,
                rank: t1.rank + 1,
                children: [...t1.children, t2]
            };
        } else {
            return {
                ...t2,
                rank: t2.rank + 1,
                children: [...t2.children, t1]
            };
        }
    };

    const generateSteps = (operation, value = null) => {
        const steps = [];
        let currentTrees = [...trees];

        if (operation === 'insert') {
            const newTree = createNode(value, 0);

            steps.push({
                trees: [newTree],
                newTree: newTree,
                highlightTree: newTree.id,
                operation: 'insert',
                value: value,
                explanation: `➕ Create new binomial tree B₀ with value ${value}`,
                phase: 'create',
                carryTree: null
            });

            // Merge with existing trees
            let treesToMerge = [newTree, ...currentTrees].sort((a, b) => a.rank - b.rank);

            steps.push({
                trees: treesToMerge,
                newTree: null,
                highlightTree: null,
                operation: 'insert',
                value: value,
                explanation: `🔄 Begin merging: combine trees of same rank like binary addition`,
                phase: 'prepare',
                carryTree: null
            });

            // Perform binomial heap merge (like binary addition with carry)
            const result = [];
            let carry = null;
            let i = 0;

            while (i < treesToMerge.length || carry !== null) {
                const candidates = [];

                if (carry !== null) candidates.push(carry);
                if (i < treesToMerge.length && (!carry || treesToMerge[i].rank === carry.rank)) {
                    candidates.push(treesToMerge[i]);
                    i++;
                }
                if (i < treesToMerge.length && candidates.length === 1 && treesToMerge[i].rank === candidates[0].rank) {
                    candidates.push(treesToMerge[i]);
                    i++;
                }

                if (candidates.length === 1) {
                    result.push(candidates[0]);
                    carry = null;

                    steps.push({
                        trees: [...result],
                        newTree: null,
                        highlightTree: candidates[0].id,
                        operation: 'insert',
                        value: value,
                        explanation: `✅ Tree B${candidates[0].rank} added to result`,
                        phase: 'add',
                        carryTree: null
                    });
                } else if (candidates.length === 2) {
                    carry = mergeTrees(candidates[0], candidates[1]);

                    steps.push({
                        trees: [...result],
                        newTree: null,
                        highlightTree: null,
                        operation: 'insert',
                        value: value,
                        explanation: `🔗 Merge two B${candidates[0].rank} trees → create B${carry.rank} (carry)`,
                        phase: 'merge',
                        carryTree: carry
                    });
                } else if (candidates.length === 3) {
                    const merged = mergeTrees(candidates[0], candidates[1]);
                    result.push(candidates[2]);
                    carry = merged;

                    steps.push({
                        trees: [...result],
                        newTree: null,
                        highlightTree: candidates[2].id,
                        operation: 'insert',
                        value: value,
                        explanation: `⚡ Three B${candidates[0].rank} trees: keep one, merge two → B${merged.rank} (carry)`,
                        phase: 'merge',
                        carryTree: carry
                    });
                }
            }

            currentTrees = result.sort((a, b) => a.rank - b.rank);

            steps.push({
                trees: currentTrees,
                newTree: null,
                highlightTree: null,
                operation: 'insert',
                value: value,
                explanation: `🎯 Insert complete! Queue now has ${currentTrees.length} binomial tree(s)`,
                phase: 'complete',
                carryTree: null
            });

        } else if (operation === 'extractMin') {
            if (currentTrees.length === 0) {
                steps.push({
                    trees: [],
                    newTree: null,
                    highlightTree: null,
                    operation: 'extractMin',
                    value: null,
                    explanation: `❌ Queue is empty!`,
                    phase: 'error',
                    carryTree: null
                });
                return steps;
            }

            // Find tree with minimum root
            let minTree = currentTrees[0];
            let minIndex = 0;

            for (let i = 1; i < currentTrees.length; i++) {
                if (currentTrees[i].value < minTree.value) {
                    minTree = currentTrees[i];
                    minIndex = i;
                }
            }

            steps.push({
                trees: currentTrees,
                newTree: null,
                highlightTree: minTree.id,
                operation: 'extractMin',
                value: minTree.value,
                explanation: `🎯 Found minimum: ${minTree.value} in tree B${minTree.rank}`,
                phase: 'find',
                carryTree: null
            });

            // Remove min tree
            const remainingTrees = currentTrees.filter((_, i) => i !== minIndex);

            steps.push({
                trees: remainingTrees,
                newTree: null,
                highlightTree: null,
                operation: 'extractMin',
                value: minTree.value,
                explanation: `🗑️ Remove tree with minimum root`,
                phase: 'remove',
                carryTree: null
            });

            // The children of removed tree become new binomial queue
            // Ensure they are sorted by rank for the merge logic
            const childrenQueue = [...minTree.children].sort((a, b) => a.rank - b.rank);

            if (childrenQueue.length > 0) {
                steps.push({
                    trees: childrenQueue,
                    newTree: null,
                    highlightTree: null,
                    operation: 'extractMin',
                    value: minTree.value,
                    explanation: `📦 Children of removed tree form new queue with ${childrenQueue.length} tree(s)`,
                    phase: 'children',
                    carryTree: null
                });

                // Merge the two queues
                steps.push({
                    trees: [...remainingTrees, ...childrenQueue],
                    newTree: null,
                    highlightTree: null,
                    operation: 'extractMin',
                    value: minTree.value,
                    explanation: `🔗 Merge remaining trees with children trees`,
                    phase: 'merging',
                    carryTree: null
                });
            }

            // Final merged result
            const allTrees = [...remainingTrees, ...childrenQueue].sort((a, b) => a.rank - b.rank);
            const finalMerged = [];
            let carry = null;
            let i = 0;

            while (i < allTrees.length || carry !== null) {
                const candidates = [];

                if (carry !== null) candidates.push(carry);
                while (i < allTrees.length && (!carry || allTrees[i].rank === carry.rank || candidates.length === 0)) {
                    if (candidates.length > 0 && allTrees[i].rank !== candidates[0].rank) break;
                    candidates.push(allTrees[i]);
                    i++;
                    if (candidates.length >= 2) break;
                }

                if (candidates.length === 1) {
                    finalMerged.push(candidates[0]);
                    carry = null;
                } else if (candidates.length >= 2) {
                    carry = mergeTrees(candidates[0], candidates[1]);
                    if (candidates.length === 3) {
                        finalMerged.push(candidates[2]);
                    }
                }
            }

            steps.push({
                trees: finalMerged,
                newTree: null,
                highlightTree: null,
                operation: 'extractMin',
                value: minTree.value,
                explanation: `✅ Extract complete! Removed ${minTree.value}. Queue has ${finalMerged.length} tree(s)`,
                phase: 'complete',
                carryTree: null
            });

        } else if (operation === 'findMin') {
            if (currentTrees.length === 0) {
                steps.push({
                    trees: [],
                    newTree: null,
                    highlightTree: null,
                    operation: 'findMin',
                    value: null,
                    explanation: `❌ Queue is empty!`,
                    phase: 'error',
                    carryTree: null
                });
                return steps;
            }

            let minValue = currentTrees[0].value;
            let minId = currentTrees[0].id;

            for (const tree of currentTrees) {
                if (tree.value < minValue) {
                    minValue = tree.value;
                    minId = tree.id;
                }
            }

            steps.push({
                trees: currentTrees,
                newTree: null,
                highlightTree: minId,
                operation: 'findMin',
                value: minValue,
                explanation: `👀 Minimum value: ${minValue}`,
                phase: 'complete',
                carryTree: null
            });
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
        setIsPlaying(true);
    };

    const handleExtractMin = () => {
        const steps = generateSteps('extractMin');
        setStepHistory(steps);
        setCurrentStep(0);
        setIsPlaying(true);
    };

    const handleFindMin = () => {
        const steps = generateSteps('findMin');
        setStepHistory(steps);
        setCurrentStep(0);
    };

    const playAnimation = () => {
        if (stepHistory.length === 0) return;
        setIsPlaying(true);
    };

    const pauseAnimation = () => {
        setIsPlaying(false);
    };

    const reset = () => {
        setTrees([]);
        setStepHistory([]);
        setCurrentStep(0);
        setIsPlaying(false);
    };

    useEffect(() => {
        let interval;
        if (isPlaying && currentStep < stepHistory.length - 1) {
            interval = setInterval(() => {
                setCurrentStep(prev => prev + 1);
            }, speed);
        } else if (currentStep >= stepHistory.length - 1) {
            setIsPlaying(false);
            if (stepHistory[stepHistory.length - 1]) {
                setTrees(stepHistory[stepHistory.length - 1].trees);
            }
        }
        return () => clearInterval(interval);
    }, [isPlaying, currentStep, stepHistory, speed]);

    const currentState = stepHistory[currentStep] || {
        trees: trees,
        newTree: null,
        highlightTree: null,
        operation: '',
        value: null,
        explanation: 'Select an operation to begin visualization',
        phase: '',
        carryTree: null
    };

    const renderBinomialTree = (tree, x, y, isHighlight, isCarry = false) => {
        const nodeRadius = 18;
        const levelHeight = 60;
        const nodeSpacing = 40;

        const renderNode = (node, posX, posY) => {
            const elements = [];
            const nodeColor = isHighlight && node.id === currentState.highlightTree
                ? 'fill-yellow-400 stroke-yellow-600 animate-pulse'
                : isCarry
                    ? 'fill-orange-300 stroke-orange-500'
                    : node.value === tree.value
                        ? 'fill-amber-400 stroke-amber-600'
                        : 'fill-amber-200 stroke-amber-400';

            elements.push(
                <g key={`node-${node.id}`}>
                    <circle
                        cx={posX}
                        cy={posY}
                        r={nodeRadius}
                        className={`${nodeColor} stroke-2`}
                    />
                    <text
                        x={posX}
                        y={posY}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-xs font-bold fill-slate-200"
                    >
                        {node.value}
                    </text>
                </g>
            );

            // Calculate child positions recursively
            let currentChildX = posX - (Math.pow(2, node.rank) * nodeSpacing) / 2;

            node.children.forEach((child) => {
                // Width of this child's subtree
                const childSubtreeWidth = Math.pow(2, child.rank) * nodeSpacing;
                const childX = currentChildX + childSubtreeWidth / 2;
                const childY = posY + levelHeight;

                // Draw edge
                elements.push(
                    <line
                        key={`edge-${node.id}-${child.id}`}
                        x1={posX}
                        y1={posY + nodeRadius}
                        x2={childX}
                        y2={childY - nodeRadius}
                        className="stroke-amber-400 stroke-2"
                    />
                );

                // Recursively draw child
                elements.push(...renderNode(child, childX, childY));

                currentChildX += childSubtreeWidth;
            });

            return elements;
        };

        return renderNode(tree, x, y);
    };

    const renderBinomialQueue = () => {
        if (currentState.trees.length === 0 && !currentState.carryTree) {
            return (
                <div className="flex items-center justify-center h-64 text-slate-500">
                    <div className="text-center">
                        <div className="text-4xl mb-2">🌲</div>
                        <div>Empty Binomial Queue</div>
                    </div>
                </div>
            );
        }

        // Dynamic width calculation
        let totalWidth = 100;
        currentState.trees.forEach(t => {
            totalWidth += Math.pow(2, t.rank) * 40 + 80;
        });
        if (currentState.carryTree) {
            totalWidth += Math.pow(2, currentState.carryTree.rank) * 40 + 80;
        }

        const width = Math.max(800, totalWidth);
        const height = 400;
        let currentX = 100;

        return (
            <svg width={width} height={height} className="mx-auto block">
                {/* Render each binomial tree */}
                {currentState.trees.map((tree, index) => {
                    const treeWidth = Math.pow(2, tree.rank) * 40;
                    // Center the root of the tree within its allocated space
                    const rootX = currentX + treeWidth / 2;
                    const elements = renderBinomialTree(tree, rootX, 50, true);

                    // Add rank label
                    elements.push(
                        <text
                            key={`rank-${tree.id}`}
                            x={rootX}
                            y={30}
                            textAnchor="middle"
                            className="text-sm font-bold fill-amber-700"
                        >
                            B₍{tree.rank}₎
                        </text>
                    );

                    currentX += treeWidth + 80;
                    return elements;
                })}

                {/* Render carry tree if exists */}
                {currentState.carryTree && (
                    <>
                        {(() => {
                            const carryWidth = Math.pow(2, currentState.carryTree.rank) * 40;
                            const rootX = currentX + carryWidth / 2;
                            return (
                                <>
                                    <text
                                        x={rootX}
                                        y={30}
                                        textAnchor="middle"
                                        className="text-sm font-bold fill-orange-600"
                                    >
                                        Carry: B₍{currentState.carryTree.rank}₎
                                    </text>
                                    {renderBinomialTree(currentState.carryTree, rootX, 50, false, true)}
                                </>
                            );
                        })()}
                    </>
                )}
            </svg>
        );
    };

    const getTotalNodes = (trees) => {
        let count = 0;
        const countNodes = (node) => {
            count++;
            node.children.forEach(countNodes);
        };
        trees.forEach(countNodes);
        return count;
    };

    const codeExample = `class BinomialTreeNode:
    def __init__(self, value):
        self.value = value
        self.rank = 0
        self.children = []
        self.parent = None

class BinomialQueue:
    def __init__(self):
        self.trees = []  # List of binomial trees sorted by rank
    
    def merge_trees(self, t1, t2):
        """Merge two binomial trees of same rank"""
        if t1.value <= t2.value:
            t1.children.append(t2)
            t2.parent = t1
            t1.rank += 1
            return t1
        else:
            t2.children.append(t1)
            t1.parent = t2
            t2.rank += 1
            return t2
    
    def insert(self, value):
        """Insert a new value - O(log n) amortized"""
        new_tree = BinomialTreeNode(value)
        self._merge_queue([new_tree])
    
    def _merge_queue(self, other_trees):
        """Merge another binomial queue (like binary addition)"""
        all_trees = sorted(self.trees + other_trees, 
                          key=lambda t: t.rank)
        
        result = []
        carry = None
        i = 0
        
        while i < len(all_trees) or carry:
            # Collect trees of same rank
            candidates = []
            if carry:
                candidates.append(carry)
            
            while i < len(all_trees):
                if not candidates or \\
                   all_trees[i].rank == candidates[0].rank:
                    candidates.append(all_trees[i])
                    i += 1
                    if len(candidates) >= 2:
                        break
                else:
                    break
            
            # Handle different cases
            if len(candidates) == 1:
                result.append(candidates[0])
                carry = None
            elif len(candidates) == 2:
                carry = self.merge_trees(candidates[0], candidates[1])
            elif len(candidates) == 3:
                result.append(candidates[2])
                carry = self.merge_trees(candidates[0], candidates[1])
        
        self.trees = result
    
    def find_min(self):
        """Find minimum value - O(log n)"""
        if not self.trees:
            return None
        return min(tree.value for tree in self.trees)
    
    def extract_min(self):
        """Remove and return minimum - O(log n)"""
        if not self.trees:
            return None
        
        # Find tree with minimum root
        min_tree = min(self.trees, key=lambda t: t.value)
        min_value = min_tree.value
        
        # Remove min tree from queue
        self.trees.remove(min_tree)
        
        # Children become new binomial queue
        children_queue = list(reversed(min_tree.children))
        
        # Merge the two queues
        self._merge_queue(children_queue)
        
        return min_value
    
    def size(self):
        """Return number of elements - O(log n)"""
        count = 0
        for tree in self.trees:
            count += 2 ** tree.rank
        return count`;

    return (
        <div className="min-h-screen bg-slate-950">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-600 to-orange-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex items-center mb-6">
                        <Link href="/heap-like-data-structures" className="flex items-center text-white hover:text-amber-200 transition-colors mr-4">
                            <ArrowLeft className="h-5 w-5 mr-2" />
                            Back to Heap Data Structures
                        </Link>
                    </div>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">
                            Binomial Queue Visualization
                        </h1>
                        <p className="text-xl text-amber-100 mb-6 max-w-3xl mx-auto">
                            A collection of binomial trees with unique ranks, supporting efficient merge operations. Operations work like binary addition!
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                                <Play className="h-4 w-4" />
                                Binary-Addition Style Merging
                            </div>
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                                🌲 Forest of Binomial Trees
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Visualization Panel */}
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                        <h2 className="text-2xl font-bold text-slate-100 mb-6">Binomial Queue Visualization</h2>

                        {/* Controls */}
                        <div className="mb-6 space-y-4">
                            <div className="flex flex-wrap gap-2">
                                <input
                                    type="number"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder="Enter value"
                                    className="px-3 py-2 bg-slate-800/80 border border-slate-700 text-slate-200 rounded-md focus:ring-amber-500 focus:border-amber-500 placeholder-slate-500"
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
                                <label className="text-sm font-medium text-slate-300">Speed:</label>
                                <select
                                    value={speed}
                                    onChange={(e) => setSpeed(Number(e.target.value))}
                                    className="px-2 py-1 border border-slate-700 rounded text-sm"
                                >
                                    <option value={2500}>Slow</option>
                                    <option value={1500}>Normal</option>
                                    <option value={800}>Fast</option>
                                </select>
                            </div>
                        </div>

                        {/* Tree Visualization */}
                        <div className="mb-6 bg-slate-800/60 rounded-lg p-4 overflow-x-auto">
                            {renderBinomialQueue()}
                        </div>

                        {/* Queue Info */}
                        <div className="mb-6 grid grid-cols-3 gap-4">
                            <div className="bg-slate-800/60 rounded-lg p-3 text-center">
                                <div className="text-sm text-slate-400">Trees</div>
                                <div className="text-2xl font-bold text-amber-600">
                                    {currentState.trees.length}
                                </div>
                            </div>
                            <div className="bg-slate-800/60 rounded-lg p-3 text-center">
                                <div className="text-sm text-slate-400">Total Nodes</div>
                                <div className="text-2xl font-bold text-amber-600">
                                    {getTotalNodes(currentState.trees)}
                                </div>
                            </div>
                            <div className="bg-slate-800/60 rounded-lg p-3 text-center">
                                <div className="text-sm text-slate-400">Ranks</div>
                                <div className="text-lg font-bold text-amber-600">
                                    {currentState.trees.map(t => t.rank).join(', ') || '-'}
                                </div>
                            </div>
                        </div>

                        {/* Step Explanation */}
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                            <h3 className="font-semibold text-amber-300 mb-2">Current Step:</h3>
                            <p className="text-amber-300">{currentState.explanation}</p>
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
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-2xl font-bold text-slate-100 mb-4">Complexity Analysis</h2>
                            <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="text-center">
                                        <div className="text-xl font-bold text-green-600">O(log n)</div>
                                        <div className="text-sm text-slate-400">Insert*</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xl font-bold text-green-600">O(log n)</div>
                                        <div className="text-sm text-slate-400">Extract Min</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xl font-bold text-green-600">O(log n)</div>
                                        <div className="text-sm text-slate-400">Find Min</div>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="text-lg font-bold text-green-600">O(log n) Merge</div>
                                    <div className="text-sm text-slate-400">Efficient queue union</div>
                                </div>
                                <div className="text-xs text-slate-500 text-center">
                                    *O(1) amortized for insert
                                </div>
                            </div>
                        </div>

                        {/* Binomial Tree Properties */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-2xl font-bold text-slate-100 mb-4">
                                Binomial Tree B<sub>k</sub>
                            </h2>

                            <div className="space-y-3 text-sm text-slate-400">
                                <div>
                                    • <strong>Definition:</strong>{" "}
                                    B<sub>0</sub> is a single node,{" "}
                                    B<sub>k</sub> = B<sub>k−1</sub> + B<sub>k−1</sub>
                                </div>

                                <div>
                                    • <strong>Node Count:</strong>{" "}
                                    Exactly 2<sup>k</sup> nodes in B<sub>k</sub>
                                </div>

                                <div>
                                    • <strong>Height:</strong>{" "}
                                    Height of B<sub>k</sub> is k
                                </div>

                                <div>
                                    • <strong>Children:</strong>{" "}
                                    Root has k children:{" "}
                                    B<sub>k−1</sub>, B<sub>k−2</sub>, …, B<sub>0</sub>
                                </div>

                                <div>
                                    • <strong>Merge Rule:</strong>{" "}
                                    Two B<sub>k</sub> trees merge to form B<sub>k+1</sub>
                                </div>

                                <div>
                                    • <strong>Min-Heap:</strong>{" "}
                                    Every parent ≤ children
                                </div>
                            </div>
                        </div>


                        {/* Binary Addition Analogy */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-2xl font-bold text-slate-100 mb-4">
                                Binary Addition Analogy
                            </h2>

                            <div className="space-y-3 text-sm text-slate-400">
                                <div>
                                    • Each rank represents a <strong>bit position</strong>
                                </div>

                                <div>
                                    • At most <strong>one tree</strong> per rank (like 0 or 1)
                                </div>

                                <div>
                                    • Two trees of rank k → one tree of rank k+1 (<strong>carry</strong>)
                                </div>

                                <div>
                                    • Insert is like <strong>adding 1</strong> in binary
                                </div>

                                <div>
                                    • Example: 13 nodes = 1101<sub>2</sub> → trees of rank 0, 2, 3
                                </div>
                            </div>

                            <div className="mt-4 p-3 bg-slate-800/60 rounded-lg">
                                <div className="text-xs font-mono text-amber-300">
                                    5 nodes = 101<sub>2</sub> → B<sub>0</sub> + B<sub>2</sub>
                                    <br />
                                    +1 → 110<sub>2</sub> → B<sub>1</sub> + B<sub>2</sub>
                                </div>
                            </div>
                        </div>


                        {/* Applications */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-2xl font-bold text-slate-100 mb-4">
                                Applications
                            </h2>

                            <div className="space-y-3 text-sm text-slate-400">
                                <div>
                                    • <strong>Union-Find:</strong> Efficient merging of priority queues
                                </div>

                                <div>
                                    • <strong>External Sorting:</strong> K-way merge with large datasets
                                </div>

                                <div>
                                    • <strong>Parallel Algorithms:</strong> Distributed priority queues
                                </div>

                                <div>
                                    • <strong>Event Simulation:</strong> When merging queues is common
                                </div>
                            </div>
                        </div>


                        {/* Code Example */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                            <h2 className="text-2xl font-bold text-slate-100 mb-4">Implementation</h2>
                            <CodeBlock code={codeExample} language="python" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
