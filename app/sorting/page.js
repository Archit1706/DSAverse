"use client";

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Clock, Code, Play } from 'lucide-react';

const SortingPage = () => {
    const sortingAlgorithms = [
        {
            name: "Bubble Sort",
            slug: "bubble-sort",
            description: "Simple comparison-based algorithm that repeatedly steps through the list",
            timeComplexity: "O(n²)",
            spaceComplexity: "O(1)",
            difficulty: "Beginner",
            stable: true
        },
        {
            name: "Selection Sort",
            slug: "selection-sort",
            description: "Finds the minimum element and places it at the beginning",
            timeComplexity: "O(n²)",
            spaceComplexity: "O(1)",
            difficulty: "Beginner",
            stable: false
        },
        {
            name: "Insertion Sort",
            slug: "insertion-sort",
            description: "Builds the sorted array one element at a time",
            timeComplexity: "O(n²)",
            spaceComplexity: "O(1)",
            difficulty: "Beginner",
            stable: true
        },
        {
            name: "Merge Sort",
            slug: "merge-sort",
            description: "Divide and conquer algorithm that divides the array into halves",
            timeComplexity: "O(n log n)",
            spaceComplexity: "O(n)",
            difficulty: "Intermediate",
            stable: true
        },
        {
            name: "Quick Sort",
            slug: "quick-sort",
            description: "Efficient divide and conquer algorithm using pivot element",
            timeComplexity: "O(n log n)",
            spaceComplexity: "O(log n)",
            difficulty: "Intermediate",
            stable: false
        },
        {
            name: "Heap Sort",
            slug: "heap-sort",
            description: "Uses binary heap data structure to sort elements",
            timeComplexity: "O(n log n)",
            spaceComplexity: "O(1)",
            difficulty: "Advanced",
            stable: false
        },
        {
            name: "Radix Sort",
            slug: "radix-sort",
            description: "Non-comparison based sorting by processing individual digits",
            timeComplexity: "O(d × (n + k))",
            spaceComplexity: "O(n + k)",
            difficulty: "Advanced",
            stable: true
        },
        {
            name: "Bucket Sort",
            slug: "bucket-sort",
            description: "Distributes elements into buckets and sorts each bucket individually",
            timeComplexity: "O(n + k)",
            spaceComplexity: "O(n + k)",
            difficulty: "Advanced",
            stable: true
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
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="text-center">
                        <h1 className="text-4xl md:text-6xl font-bold mb-6">
                            Sorting Algorithms
                        </h1>
                        <p className="text-xl text-orange-100 mb-8 max-w-3xl mx-auto">
                            Master the fundamental sorting algorithms through interactive visualizations.
                            Watch how different algorithms organize data step by step.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                                <Play className="h-4 w-4" />
                                Interactive Visualizations
                            </div>
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                                <Code className="h-4 w-4" />
                                Code Examples
                            </div>
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                                <Clock className="h-4 w-4" />
                                Complexity Analysis
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Algorithms Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {sortingAlgorithms.map((algorithm, index) => (
                        <Link key={index} href={`/sorting/${algorithm.slug}`}>
                            <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:transform hover:scale-105 border-2 border-orange-100 hover:border-orange-300 overflow-hidden">
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-xl font-bold text-gray-900">{algorithm.name}</h3>
                                        <ArrowRight className="h-5 w-5 text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>

                                    <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                                        {algorithm.description}
                                    </p>

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium text-gray-700">Time Complexity:</span>
                                            <code className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-sm">
                                                {algorithm.timeComplexity}
                                            </code>
                                        </div>

                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium text-gray-700">Space Complexity:</span>
                                            <code className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-sm">
                                                {algorithm.spaceComplexity}
                                            </code>
                                        </div>

                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium text-gray-700">Difficulty:</span>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(algorithm.difficulty)}`}>
                                                {algorithm.difficulty}
                                            </span>
                                        </div>

                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium text-gray-700">Stable:</span>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${algorithm.stable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                {algorithm.stable ? 'Yes' : 'No'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-6">
                                        <button className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 py-2 rounded-lg font-medium hover:from-orange-600 hover:to-amber-600 transition-all duration-200 flex items-center justify-center gap-2">
                                            <Play className="h-4 w-4" />
                                            Start Visualization
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Info Section */}
            <div className="bg-white border-t border-orange-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">
                            Why Learn Sorting Algorithms?
                        </h2>
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                            Sorting algorithms are fundamental to computer science and form the foundation
                            for understanding more complex algorithms and data structures.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="text-center p-6">
                            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Code className="h-8 w-8 text-orange-600" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2 text-gray-900">Algorithm Design</h3>
                            <p className="text-gray-600">
                                Learn different algorithmic paradigms like divide-and-conquer and greedy approaches
                            </p>
                        </div>

                        <div className="text-center p-6">
                            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Clock className="h-8 w-8 text-orange-600" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2 text-gray-900">Time Complexity</h3>
                            <p className="text-gray-600">
                                Understand Big O notation and how to analyze algorithm performance
                            </p>
                        </div>

                        <div className="text-center p-6">
                            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Play className="h-8 w-8 text-orange-600" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2 text-gray-900">Practical Applications</h3>
                            <p className="text-gray-600">
                                Apply sorting in real-world scenarios like databases, search engines, and data processing
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SortingPage;