'use client';

import React from 'react';
import { Play, Code, Clock, Layers, GitMerge, Zap } from 'lucide-react';
import Link from 'next/link';

export default function HeapLikeDataStructuresPage() {
    const heapDataStructures = [
        {
            name: "Heaps",
            slug: "heaps",
            description: "Complete binary tree with heap property - parent is greater (max-heap) or smaller (min-heap) than children. Array-based implementation.",
            timeComplexity: "O(log n)",
            spaceComplexity: "O(n)",
            difficulty: "Intermediate",
            icon: <Layers className="h-8 w-8" />,
            applications: ["Priority Queues", "Heap Sort", "Dijkstra's Algorithm"],
            operations: ["Insert: O(log n)", "Extract: O(log n)", "Peek: O(1)"]
        },
        {
            name: "Binomial Queues",
            slug: "binomial-queues",
            description: "Collection of binomial trees with unique ranks. Supports efficient merge operations using binary addition principle.",
            timeComplexity: "O(log n)",
            spaceComplexity: "O(n)",
            difficulty: "Advanced",
            icon: <GitMerge className="h-8 w-8" />,
            applications: ["Union-Find", "External Sorting", "Parallel Algorithms"],
            operations: ["Insert: O(1)*", "Extract Min: O(log n)", "Merge: O(log n)"]
        },
        {
            name: "Fibonacci Heaps",
            slug: "fibonacci-heaps",
            description: "Lazy mergeable heap with roots forming circular doubly-linked list. Excellent amortized time bounds for decrease-key.",
            timeComplexity: "O(1)*",
            spaceComplexity: "O(n)",
            difficulty: "Advanced",
            icon: <Zap className="h-8 w-8" />,
            applications: ["Prim's Algorithm", "Dijkstra's Algorithm", "Network Optimization"],
            operations: ["Insert: O(1)", "Decrease Key: O(1)*", "Extract Min: O(log n)*"]
        },
        {
            name: "Leftist Heaps",
            slug: "leftist-heaps",
            description: "Binary heap with leftist property - null path length of left child ≥ right child. Efficient merging with rightmost path.",
            timeComplexity: "O(log n)",
            spaceComplexity: "O(n)",
            difficulty: "Advanced",
            icon: <Layers className="h-8 w-8" />,
            applications: ["Mergeable Priority Queues", "Discrete Event Simulation", "Graph Algorithms"],
            operations: ["Merge: O(log n)", "Insert: O(log n)", "Extract Min: O(log n)"]
        },
        {
            name: "Skew Heaps",
            slug: "skew-heaps",
            description: "Self-adjusting version of leftist heap without maintaining null path lengths. Simpler with similar amortized performance.",
            timeComplexity: "O(log n)*",
            spaceComplexity: "O(n)",
            difficulty: "Advanced",
            icon: <Layers className="h-8 w-8" />,
            applications: ["Simple Mergeable Heaps", "Dynamic Data Structures", "Educational Purposes"],
            operations: ["Merge: O(log n)*", "Insert: O(log n)*", "Extract Min: O(log n)*"]
        }
    ];

    const getDifficultyColor = (difficulty) => {
        switch (difficulty) {
            case 'Beginner': return 'bg-green-100 text-green-800';
            case 'Intermediate': return 'bg-yellow-100 text-yellow-800';
            case 'Advanced': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="text-center">
                        <h1 className="text-4xl md:text-6xl font-bold mb-6">
                            Heap-like Data Structures
                        </h1>
                        <p className="text-xl text-amber-100 mb-8 max-w-3xl mx-auto">
                            Explore priority queue implementations with efficient merge, insert, and extract operations.
                            From classic binary heaps to advanced mergeable structures.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                                <Play className="h-4 w-4" />
                                Interactive Visualizations
                            </div>
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                                <Code className="h-4 w-4" />
                                Implementation Details
                            </div>
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                                <Clock className="h-4 w-4" />
                                Complexity Analysis
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Data Structures Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {heapDataStructures.map((structure, index) => (
                        <Link key={index} href={`/heap-like-data-structures/${structure.slug}`}>
                            <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group cursor-pointer h-full">
                                {/* Header */}
                                <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-6 text-white">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-amber-100">
                                            {structure.icon}
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getDifficultyColor(structure.difficulty)}`}>
                                            {structure.difficulty}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold mb-2 group-hover:text-amber-100 transition-colors">
                                        {structure.name}
                                    </h3>
                                    <p className="text-amber-100 text-sm leading-relaxed">
                                        {structure.description}
                                    </p>
                                </div>

                                {/* Complexity Info */}
                                <div className="p-6">
                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="text-center">
                                            <div className="text-lg font-bold text-amber-600">{structure.timeComplexity}</div>
                                            <div className="text-xs text-gray-600">Time Complexity</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-lg font-bold text-amber-600">{structure.spaceComplexity}</div>
                                            <div className="text-xs text-gray-600">Space Complexity</div>
                                        </div>
                                    </div>

                                    {/* Operations */}
                                    <div className="mb-4">
                                        <h4 className="text-sm font-semibold text-gray-800 mb-2">Key Operations:</h4>
                                        <div className="space-y-1">
                                            {structure.operations.map((op, idx) => (
                                                <div key={idx} className="text-xs text-gray-600 flex items-center">
                                                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full mr-2"></span>
                                                    {op}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Applications */}
                                    <div className="mb-4">
                                        <h4 className="text-sm font-semibold text-gray-800 mb-2">Common Applications:</h4>
                                        <div className="space-y-1">
                                            {structure.applications.map((app, idx) => (
                                                <div key={idx} className="text-xs text-gray-600 flex items-center">
                                                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full mr-2"></span>
                                                    {app}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                        <span className="text-sm font-medium text-amber-600 group-hover:text-amber-800 transition-colors">
                                            Explore Visualization →
                                        </span>
                                        <div className="flex gap-1">
                                            <Play className="h-4 w-4 text-amber-500" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Information Sections */}
                <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Why Learn Heap Structures? */}
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Why Learn Heap Structures?</h2>
                        <div className="space-y-4 text-gray-600">
                            <p className="text-sm leading-relaxed">
                                Heap-like structures are essential for priority-based operations and are fundamental
                                to many graph algorithms and scheduling systems.
                            </p>
                            <div className="space-y-2">
                                <div className="flex items-center text-sm">
                                    <span className="w-2 h-2 bg-amber-400 rounded-full mr-3"></span>
                                    Core of priority queue implementations
                                </div>
                                <div className="flex items-center text-sm">
                                    <span className="w-2 h-2 bg-amber-400 rounded-full mr-3"></span>
                                    Critical for graph algorithms (Dijkstra, Prim)
                                </div>
                                <div className="flex items-center text-sm">
                                    <span className="w-2 h-2 bg-amber-400 rounded-full mr-3"></span>
                                    Efficient merging and union operations
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Learning Path */}
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Recommended Learning Path</h2>
                        <div className="space-y-3">
                            <div className="flex items-center text-sm text-gray-600">
                                <span className="w-6 h-6 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-xs font-bold mr-3">1</span>
                                Start with Binary Heaps
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                                <span className="w-6 h-6 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-xs font-bold mr-3">2</span>
                                Understand Binomial Queues
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                                <span className="w-6 h-6 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-xs font-bold mr-3">3</span>
                                Explore Leftist Heaps
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                                <span className="w-6 h-6 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-xs font-bold mr-3">4</span>
                                Study Skew Heaps
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                                <span className="w-6 h-6 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-xs font-bold mr-3">5</span>
                                Master Fibonacci Heaps
                            </div>
                        </div>
                    </div>

                    {/* Key Concepts */}
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Key Concepts</h2>
                        <div className="space-y-4 text-gray-600">
                            <div className="border-l-4 border-amber-400 pl-3">
                                <h3 className="font-semibold text-gray-800 text-sm">Heap Property</h3>
                                <p className="text-xs">Parent-child ordering for priority</p>
                            </div>
                            <div className="border-l-4 border-amber-400 pl-3">
                                <h3 className="font-semibold text-gray-800 text-sm">Merge Operations</h3>
                                <p className="text-xs">Combining two heaps efficiently</p>
                            </div>
                            <div className="border-l-4 border-amber-400 pl-3">
                                <h3 className="font-semibold text-gray-800 text-sm">Amortized Analysis</h3>
                                <p className="text-xs">Average cost over sequence of operations</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Comparison Table */}
                <div className="mt-12 bg-white rounded-xl shadow-lg p-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Quick Comparison</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b-2 border-gray-200">
                                    <th className="text-left py-3 px-4 font-semibold text-gray-800">Structure</th>
                                    <th className="text-center py-3 px-4 font-semibold text-amber-600">Insert</th>
                                    <th className="text-center py-3 px-4 font-semibold text-amber-600">Extract Min</th>
                                    <th className="text-center py-3 px-4 font-semibold text-amber-600">Merge</th>
                                    <th className="text-center py-3 px-4 font-semibold text-amber-600">Best Use Case</th>
                                </tr>
                            </thead>
                            <tbody className="text-gray-600">
                                <tr className="border-b border-gray-100">
                                    <td className="py-3 px-4 font-medium">Binary Heap</td>
                                    <td className="py-3 px-4 text-center">O(log n)</td>
                                    <td className="py-3 px-4 text-center">O(log n)</td>
                                    <td className="py-3 px-4 text-center">O(n)</td>
                                    <td className="py-3 px-4 text-center">Simple priority queues</td>
                                </tr>
                                <tr className="border-b border-gray-100">
                                    <td className="py-3 px-4 font-medium">Binomial Queue</td>
                                    <td className="py-3 px-4 text-center">O(1)*</td>
                                    <td className="py-3 px-4 text-center">O(log n)</td>
                                    <td className="py-3 px-4 text-center">O(log n)</td>
                                    <td className="py-3 px-4 text-center">Frequent merging</td>
                                </tr>
                                <tr className="border-b border-gray-100">
                                    <td className="py-3 px-4 font-medium">Fibonacci Heap</td>
                                    <td className="py-3 px-4 text-center">O(1)</td>
                                    <td className="py-3 px-4 text-center">O(log n)*</td>
                                    <td className="py-3 px-4 text-center">O(1)</td>
                                    <td className="py-3 px-4 text-center">Graph algorithms</td>
                                </tr>
                                <tr className="border-b border-gray-100">
                                    <td className="py-3 px-4 font-medium">Leftist Heap</td>
                                    <td className="py-3 px-4 text-center">O(log n)</td>
                                    <td className="py-3 px-4 text-center">O(log n)</td>
                                    <td className="py-3 px-4 text-center">O(log n)</td>
                                    <td className="py-3 px-4 text-center">Persistent structures</td>
                                </tr>
                                <tr>
                                    <td className="py-3 px-4 font-medium">Skew Heap</td>
                                    <td className="py-3 px-4 text-center">O(log n)*</td>
                                    <td className="py-3 px-4 text-center">O(log n)*</td>
                                    <td className="py-3 px-4 text-center">O(log n)*</td>
                                    <td className="py-3 px-4 text-center">Simple implementation</td>
                                </tr>
                            </tbody>
                        </table>
                        <div className="mt-4 text-xs text-gray-500 text-center">
                            * Amortized time complexity
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}