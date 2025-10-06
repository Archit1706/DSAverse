'use client';

import React from 'react';
import { Play, Code, Clock, Database, List, Layers, ArrowUpDown } from 'lucide-react';
import Link from 'next/link';

export default function BasicsPage() {
    const basicDataStructures = [
        {
            name: "Stack: Array Implementation",
            slug: "stack-array",
            description: "LIFO data structure using fixed-size array with push, pop, and peek operations",
            timeComplexity: "O(1)",
            spaceComplexity: "O(n)",
            difficulty: "Beginner",
            icon: <Layers className="h-8 w-8" />,
            applications: ["Function Calls", "Undo Operations", "Expression Evaluation"]
        },
        {
            name: "Stack: Linked List Implementation",
            slug: "stack-linked-list",
            description: "LIFO data structure using dynamic linked list with flexible memory allocation",
            timeComplexity: "O(1)",
            spaceComplexity: "O(n)",
            difficulty: "Beginner",
            icon: <Layers className="h-8 w-8" />,
            applications: ["Memory Efficient", "Dynamic Size", "Recursive Algorithms"]
        },
        {
            name: "Queue: Array Implementation",
            slug: "queues-array",
            description: "FIFO data structure using circular array with enqueue and dequeue operations",
            timeComplexity: "O(1)",
            spaceComplexity: "O(n)",
            difficulty: "Beginner",
            icon: <ArrowUpDown className="h-8 w-8" />,
            applications: ["Task Scheduling", "BFS Algorithms", "Print Queue"]
        },
        {
            name: "Queue: Linked List Implementation",
            slug: "queues-linked-list",
            description: "FIFO data structure using linked list with dynamic memory management",
            timeComplexity: "O(1)",
            spaceComplexity: "O(n)",
            difficulty: "Beginner",
            icon: <ArrowUpDown className="h-8 w-8" />,
            applications: ["Buffer Management", "Process Scheduling", "Network Requests"]
        },
        {
            name: "List: Array Implementation",
            slug: "lists-array",
            description: "Dynamic array with resizing capability supporting insertion, deletion, and random access",
            timeComplexity: "O(n)",
            spaceComplexity: "O(n)",
            difficulty: "Intermediate",
            icon: <List className="h-8 w-8" />,
            applications: ["Dynamic Arrays", "ArrayList in Java", "Python Lists"]
        },
        {
            name: "List: Linked List Implementation",
            slug: "lists-linked-list",
            description: "Linear collection of nodes with pointers, supporting efficient insertion and deletion",
            timeComplexity: "O(n)",
            spaceComplexity: "O(n)",
            difficulty: "Intermediate",
            icon: <Database className="h-8 w-8" />,
            applications: ["Memory Pools", "Music Playlists", "Browser History"]
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
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="text-center">
                        <h1 className="text-4xl md:text-6xl font-bold mb-6">
                            Basic Data Structures
                        </h1>
                        <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
                            Master the fundamental building blocks of computer science through interactive visualizations.
                            Learn how stacks, queues, and lists work under the hood.
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
                    {basicDataStructures.map((dataStructure, index) => (
                        <Link key={index} href={`/basics/${dataStructure.slug}`}>
                            <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group cursor-pointer">
                                {/* Header */}
                                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-blue-100">
                                            {dataStructure.icon}
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getDifficultyColor(dataStructure.difficulty)}`}>
                                            {dataStructure.difficulty}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold mb-2 group-hover:text-blue-100 transition-colors">
                                        {dataStructure.name}
                                    </h3>
                                    <p className="text-blue-100 text-sm leading-relaxed">
                                        {dataStructure.description}
                                    </p>
                                </div>

                                {/* Complexity Info */}
                                <div className="p-6">
                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="text-center">
                                            <div className="text-lg font-bold text-blue-600">{dataStructure.timeComplexity}</div>
                                            <div className="text-xs text-gray-600">Time Complexity</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-lg font-bold text-blue-600">{dataStructure.spaceComplexity}</div>
                                            <div className="text-xs text-gray-600">Space Complexity</div>
                                        </div>
                                    </div>

                                    {/* Applications */}
                                    <div className="mb-4">
                                        <h4 className="text-sm font-semibold text-gray-800 mb-2">Common Applications:</h4>
                                        <div className="space-y-1">
                                            {dataStructure.applications.map((app, idx) => (
                                                <div key={idx} className="text-xs text-gray-600 flex items-center">
                                                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2"></span>
                                                    {app}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-blue-600 group-hover:text-blue-800 transition-colors">
                                            Learn More →
                                        </span>
                                        <div className="flex gap-1">
                                            <Play className="h-4 w-4 text-blue-500" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Information Sections */}
                <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Why Learn These? */}
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Why Learn Basic Data Structures?</h2>
                        <div className="space-y-4 text-gray-600">
                            <p className="text-sm leading-relaxed">
                                These fundamental data structures form the backbone of all software systems.
                                Understanding how they work internally helps you make better design decisions.
                            </p>
                            <div className="space-y-2">
                                <div className="flex items-center text-sm">
                                    <span className="w-2 h-2 bg-blue-400 rounded-full mr-3"></span>
                                    Foundation for advanced algorithms
                                </div>
                                <div className="flex items-center text-sm">
                                    <span className="w-2 h-2 bg-blue-400 rounded-full mr-3"></span>
                                    Essential for technical interviews
                                </div>
                                <div className="flex items-center text-sm">
                                    <span className="w-2 h-2 bg-blue-400 rounded-full mr-3"></span>
                                    Used in every programming language
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Learning Path */}
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Recommended Learning Path</h2>
                        <div className="space-y-3">
                            <div className="flex items-center text-sm text-gray-600">
                                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3">1</span>
                                Start with Stack (Array)
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3">2</span>
                                Learn Queue (Array)
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3">3</span>
                                Explore Linked implementations
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3">4</span>
                                Master Dynamic Lists
                            </div>
                        </div>
                    </div>

                    {/* Key Concepts */}
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Key Concepts</h2>
                        <div className="space-y-4 text-gray-600">
                            <div className="border-l-4 border-blue-400 pl-3">
                                <h3 className="font-semibold text-gray-800 text-sm">LIFO vs FIFO</h3>
                                <p className="text-xs">Last In First Out vs First In First Out principles</p>
                            </div>
                            <div className="border-l-4 border-blue-400 pl-3">
                                <h3 className="font-semibold text-gray-800 text-sm">Memory Management</h3>
                                <p className="text-xs">Array vs Linked List memory allocation patterns</p>
                            </div>
                            <div className="border-l-4 border-blue-400 pl-3">
                                <h3 className="font-semibold text-gray-800 text-sm">Operation Complexity</h3>
                                <p className="text-xs">Understanding time and space trade-offs</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Comparison */}
                <div className="mt-12 bg-white rounded-xl shadow-lg p-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Array vs Linked List Implementations</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b-2 border-gray-200">
                                    <th className="text-left py-3 px-4 font-semibold text-gray-800">Aspect</th>
                                    <th className="text-center py-3 px-4 font-semibold text-blue-600">Array Implementation</th>
                                    <th className="text-center py-3 px-4 font-semibold text-blue-600">Linked List Implementation</th>
                                </tr>
                            </thead>
                            <tbody className="text-gray-600">
                                <tr className="border-b border-gray-100">
                                    <td className="py-3 px-4 font-medium">Memory Allocation</td>
                                    <td className="py-3 px-4 text-center">Contiguous, Fixed Size</td>
                                    <td className="py-3 px-4 text-center">Non-contiguous, Dynamic</td>
                                </tr>
                                <tr className="border-b border-gray-100">
                                    <td className="py-3 px-4 font-medium">Cache Performance</td>
                                    <td className="py-3 px-4 text-center">Better (Locality)</td>
                                    <td className="py-3 px-4 text-center">Worse (Scattered)</td>
                                </tr>
                                <tr className="border-b border-gray-100">
                                    <td className="py-3 px-4 font-medium">Memory Overhead</td>
                                    <td className="py-3 px-4 text-center">Lower</td>
                                    <td className="py-3 px-4 text-center">Higher (Pointers)</td>
                                </tr>
                                <tr className="border-b border-gray-100">
                                    <td className="py-3 px-4 font-medium">Size Flexibility</td>
                                    <td className="py-3 px-4 text-center">Fixed</td>
                                    <td className="py-3 px-4 text-center">Dynamic</td>
                                </tr>
                                <tr>
                                    <td className="py-3 px-4 font-medium">Implementation</td>
                                    <td className="py-3 px-4 text-center">Simpler</td>
                                    <td className="py-3 px-4 text-center">More Complex</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}