"use client"
import React from 'react';
import { ArrowRight, Search, BarChart3, GitBranch, Layers, Target, Shuffle, Network, Calculator } from 'lucide-react';
import Link from 'next/link';

// Visual components for each algorithm
const AlgorithmVisuals = {
    // Basics
    "Stack: Array": () => (
        <div className="flex flex-col items-center space-y-1">
            <div className="w-8 h-3 bg-blue-400 rounded animate-pulse"></div>
            <div className="w-8 h-3 bg-blue-500 rounded"></div>
            <div className="w-8 h-3 bg-blue-600 rounded"></div>
        </div>
    ),
    "Stack: Linked List": () => (
        <div className="flex flex-col items-center space-y-0">
            {[1, 2, 3].map(i => (
                <div key={i} className="flex flex-col items-center">
                    <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white"></div>
                    {i < 3 && <div className="w-0.5 h-2 bg-blue-400"></div>}
                </div>
            ))}
        </div>
    ),
    "Queues: Array": () => (
        <div className="flex items-center space-x-1">
            <div className="w-3 h-6 bg-blue-400 rounded animate-pulse"></div>
            <div className="w-3 h-6 bg-blue-500 rounded"></div>
            <div className="w-3 h-6 bg-blue-600 rounded"></div>
            <ArrowRight className="w-3 h-3 text-blue-400" />
        </div>
    ),
    "Queues: Linked List": () => (
        <div className="flex items-center space-x-1">
            {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    {i < 3 && <div className="w-2 h-0.5 ml-1 bg-blue-400"></div>}
                </div>
            ))}
        </div>
    ),
    "Lists: Array": () => (
        <div className="grid grid-cols-3 gap-1">
            {[0, 1, 2].map(i => (
                <div key={i} className="w-4 h-4 bg-blue-500 rounded text-xs text-white flex items-center justify-center">
                    {i}
                </div>
            ))}
        </div>
    ),
    "Lists: Linked List": () => (
        <div className="flex items-center">
            {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center">
                    <div className="w-6 h-4 bg-blue-500 rounded border border-blue-600 flex items-center justify-center">
                        <div className="w-1 h-1 bg-white rounded-full"></div>
                    </div>
                    {i < 3 && <ArrowRight className="w-3 h-3 text-blue-400 mx-1" />}
                </div>
            ))}
        </div>
    ),

    // Recursion
    "Factorial": () => (
        <div className="text-center">
            <div className="text-lg font-bold text-green-600">n!</div>
            <div className="text-xs text-green-500">5×4×3×2×1</div>
        </div>
    ),
    "String Reversal": () => (
        <div className="flex items-center space-x-1">
            <span className="text-sm font-mono text-green-600">abc</span>
            <Shuffle className="w-3 h-3 text-green-500" />
            <span className="text-sm font-mono text-green-600">cba</span>
        </div>
    ),
    "Fibonacci Sequence": () => (
        <div className="relative w-8 h-8">
            <div className="absolute inset-0 border-2 border-green-500 rounded-full"></div>
            <div className="absolute top-1 right-1 w-3 h-3 border border-green-400 rounded-full"></div>
            <div className="absolute bottom-1 left-1 w-2 h-2 border border-green-300 rounded-full"></div>
        </div>
    ),
    "N-Queens": () => (
        <div className="grid grid-cols-3 gap-0.5 w-8 h-8">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i} className={`${i % 2 === Math.floor(i / 3) % 2 ? 'bg-green-300' : 'bg-green-200'} ${i === 1 || i === 5 ? 'bg-green-600' : ''}`}>
                    {(i === 1 || i === 5) && <div className="text-xs text-white text-center">♛</div>}
                </div>
            ))}
        </div>
    ),
    "Maze Solver": () => (
        <div className="grid grid-cols-4 gap-0.5 w-8 h-8">
            {[1, 0, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 0, 0].map((cell, i) => (
                <div key={i} className={`${cell ? 'bg-green-600' : 'bg-green-200'} ${i === 5 ? 'bg-green-400' : ''}`}></div>
            ))}
        </div>
    ),
    "Tower of Hanoi": () => (
        <div className="flex items-end justify-center space-x-2 h-8">
            <div className="flex flex-col items-center">
                <div className="w-6 h-1.5 bg-green-600 rounded mb-0.5"></div>
                <div className="w-4 h-1.5 bg-green-500 rounded mb-0.5"></div>
                <div className="w-2 h-1.5 bg-green-400 rounded mb-0.5"></div>
                <div className="w-0.5 h-3 bg-green-700"></div>
            </div>
            <div className="flex flex-col items-center">
                <div className="w-0.5 h-6 bg-green-700"></div>
            </div>
            <div className="flex flex-col items-center">
                <div className="w-0.5 h-6 bg-green-700"></div>
            </div>
        </div>
    ),

    // Indexing
    "Binary and Linear Search": () => (
        <div className="flex items-center">
            <Search className="w-4 h-4 text-purple-500" />
            <div className="flex ml-2 space-x-1">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className={`w-2 h-4 ${i === 3 ? 'bg-purple-600 animate-pulse' : 'bg-purple-300'} rounded`}></div>
                ))}
            </div>
        </div>
    ),
    "Binary Search Trees": () => (
        <div className="relative w-8 h-8">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-purple-500 rounded-full"></div>
            <div className="absolute top-5 left-0 w-3 h-3 bg-purple-400 rounded-full"></div>
            <div className="absolute top-5 right-0 w-3 h-3 bg-purple-400 rounded-full"></div>
            <div className="absolute top-5.5 left-2 w-3 h-0.5 bg-purple-800 transform rounded -rotate-45 origin-left"></div>
            <div className="absolute top-5.5 right-2 w-3 h-0.5 bg-purple-800 transform rounded rotate-45 origin-right"></div>
        </div>
    ),
    "AVL Trees": () => (
        <div className="relative w-8 h-8">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-purple-600 rounded-full animate-pulse border-2 border-purple-400"></div>
            <div className="absolute top-4 left-1 w-2 h-2 bg-purple-500 rounded-full"></div>
            <div className="absolute top-4 right-1 w-2 h-2 bg-purple-500 rounded-full"></div>
        </div>
    ),
    "Red-Black Trees": () => (
        <div className="relative w-8 h-8">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-red-600 rounded-full"></div>
            <div className="absolute top-4 left-1 w-2 h-2 bg-gray-800 rounded-full"></div>
            <div className="absolute top-4 right-1 w-2 h-2 bg-red-500 rounded-full"></div>
        </div>
    ),
    "Splay Trees": () => (
        <div className="relative w-8 h-8">
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
            <div className="absolute top-5 left-0 w-2 h-2 bg-purple-400 rounded-full"></div>
            <div className="absolute top-0 right-0 w-2 h-2 bg-purple-400 rounded-full"></div>
        </div>
    ),
    "Open Hash Tables": () => (
        <div className="grid grid-cols-2 gap-1">
            {[1, 0, 1, 1].map((filled, i) => (
                <div key={i} className={`w-3 h-3 border-2 border-purple-400 ${filled ? 'bg-purple-500' : 'bg-white'} rounded`}></div>
            ))}
        </div>
    ),
    "Closed Hash Tables": () => (
        <div className="grid grid-cols-4 gap-0.5">
            {[1, 1, 0, 1].map((filled, i) => (
                <div key={i} className={`w-2 h-4 border border-purple-400 ${filled ? 'bg-purple-500' : 'bg-white'} rounded`}></div>
            ))}
        </div>
    ),
    "Closed Hash Tables with Buckets": () => (
        <div className="grid grid-cols-2 gap-1">
            {[1, 2, 1, 0].map((count, i) => (
                <div key={i} className="flex flex-col space-y-0.5">
                    {Array(count).fill(0).map((_, j) => (
                        <div key={j} className="w-3 h-1 bg-purple-500 rounded"></div>
                    ))}
                </div>
            ))}
        </div>
    ),
    "Trie (Prefix Tree)": () => (
        <div className="relative w-8 h-8">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-purple-600 rounded-full"></div>
            <div className="absolute top-2 left-0 w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
            <div className="absolute top-2 left-3 w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
            <div className="absolute top-2 right-0 w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
            <div className="absolute top-4 left-1 w-1 h-1 bg-purple-400 rounded-full"></div>
            <div className="absolute top-4 right-1 w-1 h-1 bg-purple-400 rounded-full"></div>
        </div>
    ),
    "Radix Tree": () => (
        <div className="relative w-8 h-8">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-purple-600 rounded"></div>
            <div className="absolute top-3 left-1 w-4 h-1 bg-purple-500 rounded"></div>
            <div className="absolute top-3 right-1 w-2 h-1 bg-purple-500 rounded"></div>
        </div>
    ),
    "Ternary Search Tree": () => (
        <div className="relative w-8 h-8">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-purple-600 rounded-full"></div>
            <div className="absolute top-4 left-0 w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
            <div className="absolute top-4 right-0 w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
        </div>
    ),
    "B Trees": () => (
        <div className="flex flex-col items-center space-y-1">
            <div className="flex space-x-1">
                <div className="w-2 h-2 bg-purple-600 rounded"></div>
                <div className="w-2 h-2 bg-purple-600 rounded"></div>
            </div>
            <div className="flex space-x-2">
                <div className="w-1.5 h-1.5 bg-purple-500 rounded"></div>
                <div className="w-1.5 h-1.5 bg-purple-500 rounded"></div>
                <div className="w-1.5 h-1.5 bg-purple-500 rounded"></div>
            </div>
        </div>
    ),
    "B+ Trees": () => (
        <div className="flex flex-col items-center space-y-1">
            <div className="flex space-x-1">
                <div className="w-2 h-2 bg-purple-600 rounded border border-purple-800"></div>
                <div className="w-2 h-2 bg-purple-600 rounded border border-purple-800"></div>
            </div>
            <div className="flex space-x-1">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="w-1 h-2 bg-purple-500 rounded"></div>
                ))}
            </div>
        </div>
    ),

    // Sorting
    "Bubble Sort": () => (
        <div className="flex items-end space-x-1">
            {[4, 2, 3, 1].map((height, i) => (
                <div key={i} className={`w-2 h-${height} bg-orange-${400 + height * 50} rounded animate-pulse`} style={{ animationDelay: `${i * 100}ms` }}></div>
            ))}
        </div>
    ),
    "Selection Sort": () => (
        <div className="flex items-end space-x-1">
            {[1, 4, 2, 3].map((height, i) => (
                <div key={i} className={`w-2 h-${height} ${i === 0 ? 'bg-orange-600' : 'bg-orange-400'} rounded`}></div>
            ))}
        </div>
    ),
    "Insertion Sort": () => (
        <div className="flex items-end space-x-1">
            {[1, 2, 4, 3].map((height, i) => (
                <div key={i} className={`w-2 h-${height} ${i < 2 ? 'bg-orange-600' : 'bg-orange-400'} rounded`}></div>
            ))}
        </div>
    ),
    "Shell Sort": () => (
        <div className="grid grid-cols-4 gap-0.5">
            {[1, 3, 2, 4].map((height, i) => (
                <div key={i} className={`w-2 h-${height} bg-orange-500 rounded ${i % 2 === 0 ? 'border border-orange-700' : ''}`}></div>
            ))}
        </div>
    ),
    "Merge Sort": () => (
        <div className="flex flex-col space-y-1">
            <div className="flex space-x-1">
                <div className="w-1 h-3 bg-orange-400 rounded"></div>
                <div className="w-1 h-2 bg-orange-400 rounded"></div>
                <div className="w-1 h-4 bg-orange-400 rounded"></div>
                <div className="w-1 h-1 bg-orange-400 rounded"></div>
            </div>
            <div className="flex space-x-1">
                <div className="w-1 h-1 bg-orange-600 rounded"></div>
                <div className="w-1 h-2 bg-orange-600 rounded"></div>
                <div className="w-1 h-3 bg-orange-600 rounded"></div>
                <div className="w-1 h-4 bg-orange-600 rounded"></div>
            </div>
        </div>
    ),
    "Quick Sort": () => (
        <div className="flex items-end space-x-1">
            {[2, 1, 4, 3].map((height, i) => (
                <div key={i} className={`w-2 h-${height} ${i === 2 ? 'bg-orange-700 animate-pulse' : 'bg-orange-500'} rounded`}></div>
            ))}
        </div>
    ),
    "Bucket Sort": () => (
        <div className="grid grid-cols-3 gap-1">
            {[2, 1, 3].map((items, i) => (
                <div key={i} className="flex flex-col-reverse space-y-reverse space-y-0.5">
                    {Array(items).fill(0).map((_, j) => (
                        <div key={j} className="w-2 h-1 bg-orange-500 rounded"></div>
                    ))}
                </div>
            ))}
        </div>
    ),
    "Counting Sort": () => (
        <div className="flex space-x-1">
            {[0, 2, 1, 1].map((count, i) => (
                <div key={i} className="flex flex-col items-center">
                    <div className="text-xs text-orange-600">{count}</div>
                    <div className="w-2 h-2 bg-orange-500 rounded"></div>
                </div>
            ))}
        </div>
    ),
    "Radix Sort": () => (
        <div className="grid grid-cols-2 gap-1">
            <div className="text-xs text-orange-600">1s</div>
            <div className="text-xs text-orange-600">10s</div>
            <div className="flex space-x-0.5">
                {[1, 2].map(i => (
                    <div key={i} className="w-1 h-2 bg-orange-500 rounded"></div>
                ))}
            </div>
            <div className="flex space-x-0.5">
                {[3, 4].map(i => (
                    <div key={i} className="w-1 h-2 bg-orange-400 rounded"></div>
                ))}
            </div>
        </div>
    ),
    "Heap Sort": () => (
        <div className="relative w-8 h-8">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-3 h-2 bg-orange-600 rounded"></div>
            <div className="absolute top-3 left-1 w-2 h-2 bg-orange-500 rounded"></div>
            <div className="absolute top-3 right-1 w-2 h-2 bg-orange-500 rounded"></div>
            <div className="absolute bottom-0 left-0 w-1.5 h-1.5 bg-orange-400 rounded"></div>
            <div className="absolute bottom-0 left-2 w-1.5 h-1.5 bg-orange-400 rounded"></div>
            <div className="absolute bottom-0 right-2 w-1.5 h-1.5 bg-orange-400 rounded"></div>
            <div className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-orange-400 rounded"></div>
        </div>
    ),

    // Searching
    "Binary Search": () => (
        <div className="flex items-center space-x-1">
            <div className="w-2 h-4 bg-red-300 rounded"></div>
            <div className="w-2 h-4 bg-red-300 rounded"></div>
            <div className="w-2 h-4 bg-red-600 rounded border-2 border-red-800 animate-pulse"></div>
            <div className="w-2 h-4 bg-red-300 rounded"></div>
            <div className="w-2 h-4 bg-red-300 rounded"></div>
        </div>
    ),
    "Linear Search": () => (
        <div className="flex items-center space-x-1">
            {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className={`w-2 h-3 ${i === 3 ? 'bg-red-600 animate-pulse' : 'bg-red-400'} rounded`}></div>
            ))}
        </div>
    ),
    "Jump Search": () => (
        <div className="flex items-end space-x-1">
            {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className={`w-2 h-3 ${i % 2 === 1 ? 'bg-red-600' : 'bg-red-300'} rounded`}></div>
            ))}
        </div>
    ),
    "Interpolation Search": () => (
        <div className="relative w-8 h-6">
            <div className="absolute bottom-2 w-full h-0.5 bg-red-300 rounded"></div>
            <div className="absolute bottom-1 left-5 w-0.5 h-4 bg-red-600 rounded"></div>
            <div className="absolute bottom-3 left-4 w-2 h-2 bg-red-500 rounded-full"></div>
        </div>
    ),
    "Exponential Search": () => (
        <div className="flex items-end space-x-1">
            {[1, 2, 4, 8].map((height, i) => (
                <div key={i} className={`w-1.5 h-${Math.min(height, 4)} bg-red-500 rounded`}></div>
            ))}
        </div>
    ),
    "Fibonacci Search": () => (
        <div className="flex items-center space-x-1">
            {[1, 1, 2, 3, 5].map((width, i) => (
                <div key={i} className={`w-${Math.min(width, 3)} h-3 bg-red-500 rounded`}></div>
            ))}
        </div>
    ),
    "Ternary Search": () => (
        <div className="flex flex-col space-y-1">
            <div className="flex space-x-1">
                {[1, 2, 3].map(i => (
                    <div key={i} className={`w-3 h-3 ${i === 2 ? 'bg-red-600' : 'bg-red-400'} rounded`}></div>
                ))}
            </div>
            <div className="w-6 h-0.5 bg-red-300 rounded"></div>
        </div>
    ),
    "Block Search": () => (
        <div className="grid grid-cols-3 gap-1">
            {[0, 0, 1, 0, 0, 0, 0, 0, 0].map((active, i) => (
                <div key={i} className={`w-2 h-2 ${active ? 'bg-red-600 animate-pulse' : 'bg-red-300'} rounded`}></div>
            ))}
        </div>
    ),

    // Heap-like Data Structures
    "Heaps": () => (
        <div className="relative w-8 h-8">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-amber-600 rounded-full text-xs text-white flex items-center justify-center font-bold">9</div>
            <div className="absolute top-5 -left-1 w-4 h-4 bg-amber-500 rounded-full text-xs text-white flex items-center justify-center font-bold">7</div>
            <div className="absolute top-5 -right-1 w-4 h-4 bg-amber-500 rounded-full text-xs text-white flex items-center justify-center font-bold">8</div>
        </div>
    ),
    "Binomial Queues": () => (
        <div className="flex space-x-2">
            <div className="w-2 h-2 bg-amber-600 rounded"></div>
            <div className="flex flex-col space-y-1">
                <div className="w-2 h-1 bg-amber-500 rounded"></div>
                <div className="w-2 h-1 bg-amber-400 rounded"></div>
            </div>
        </div>
    ),
    "Fibonacci Heaps": () => (
        <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-amber-600 rounded-full"></div>
            <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
            <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
        </div>
    ),
    "Leftist Heaps": () => (
        <div className="relative w-8 h-6">
            <div className="absolute top-0 left-2 w-3 h-3 bg-amber-600 rounded-full"></div>
            <div className="absolute top-3 left-0 w-3 h-3 bg-amber-500 rounded-full"></div>
            <div className="absolute top-6 left-2 w-2 h-2 bg-amber-400 rounded-full"></div>
        </div>
    ),
    "Skew Heaps": () => (
        <div className="relative w-8 h-6">
            <div className="absolute top-0 left-3 w-3 h-3 bg-amber-600 rounded-full transform rotate-12"></div>
            <div className="absolute top-4 left-1 w-3 h-3 bg-amber-500 rounded-full transform -rotate-12"></div>
            <div className="absolute top-6 right-1 w-2 h-2 bg-amber-400 rounded-full"></div>
        </div>
    ),

    // Graph Algorithms
    "Breadth-First Search": () => (
        <div className="relative w-8 h-8">
            <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-cyan-600 rounded-full"></div>
            <div className="absolute top-3 left-1 w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></div>
            <div className="absolute top-3 right-1 w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></div>
            <div className="absolute bottom-1 left-0 w-1.5 h-1.5 bg-cyan-400 rounded-full"></div>
            <div className="absolute bottom-1 right-0 w-1.5 h-1.5 bg-cyan-400 rounded-full"></div>
        </div>
    ),
    "Depth-First Search": () => (
        <div className="relative w-8 h-8">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-cyan-600 rounded-full"></div>
            <div className="absolute top-3 left-2 w-2 h-2 bg-cyan-500 rounded-full"></div>
            <div className="absolute bottom-0 left-3 w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"></div>
        </div>
    ),
    "Connected Components": () => (
        <div className="grid grid-cols-2 gap-2">
            <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></div>
            </div>
            <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></div>
            </div>
        </div>
    ),
    "Dijkstra's Shortest Path": () => (
        <div className="relative w-8 h-8">
            <div className="absolute top-0 -left-0.5 w-2 h-2 bg-cyan-600 rounded-full"></div>
            <div className="absolute top-2 left-3 w-2 h-2 bg-cyan-500 rounded-full"></div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-cyan-400 rounded-full"></div>
            <div className="absolute top-1 left-1 w-3 h-0.5 bg-cyan-800 rounded transform rotate-30 origin-left"></div>
            <div className="absolute top-3 left-4.5 w-4.5 h-0.5 bg-cyan-800 rounded transform rotate-52 origin-left"></div>
        </div>
    ),
    "Prim's Minimum Spanning Tree": () => (
        <Network className="w-6 h-6 text-cyan-600" />
    ),
    "Topological Sort (Indegree)": () => (
        <div className="flex flex-col space-y-1">
            <div className="flex space-x-1">
                <div className="w-2 h-2 bg-cyan-600 rounded"></div>
                <ArrowRight className="w-3 h-3 text-cyan-500" />
                <div className="w-2 h-2 bg-cyan-500 rounded"></div>
            </div>
            <div className="text-xs text-cyan-600 text-center">0→1</div>
        </div>
    ),
    "Topological Sort (DFS)": () => (
        <div className="flex flex-col space-y-1">
            <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-cyan-600 rounded"></div>
                <div className="w-2 h-2 bg-cyan-500 rounded"></div>
                <div className="w-2 h-2 bg-cyan-400 rounded"></div>
            </div>
            <div className="text-xs text-cyan-600">DFS</div>
        </div>
    ),
    "Floyd-Warshall": () => (
        <div className="grid grid-cols-3 gap-0.5">
            {[1, 2, 3, 4, 0, 6, 7, 8, 9].map((val, i) => (
                <div key={i} className={`w-2 h-2 ${val === 0 ? 'bg-cyan-700' : 'bg-cyan-400'} rounded text-xs`}></div>
            ))}
        </div>
    ),
    "Kruskal Minimum Spanning Tree": () => (
        <div className="relative w-8 h-8">
            <div className="absolute top-1 left-1 w-2 h-2 bg-cyan-600 rounded-full"></div>
            <div className="absolute top-1 right-1 w-2 h-2 bg-cyan-600 rounded-full"></div>
            <div className="absolute bottom-1 left-1 w-2 h-2 bg-cyan-600 rounded-full"></div>
            <div className="absolute bottom-1 right-1 w-2 h-2 bg-cyan-600 rounded-full"></div>
            <div className="absolute top-2 left-2 w-4 h-0.5 bg-cyan-500"></div>
            <div className="absolute top-2 left-2 w-0.5 h-4 bg-cyan-500"></div>
            <div className="absolute bottom-2 left-2 w-4 h-0.5 bg-cyan-500"></div>
        </div>
    ),

    // Dynamic Programming
    "Fibonacci Numbers": () => (
        <div className="flex flex-col items-center">
            <div className="text-xs text-rose-600 font-mono">F(n-1)</div>
            <div className="text-xs text-rose-600 font-mono">+</div>
            <div className="text-xs text-rose-600 font-mono">F(n-2)</div>
            <div className="flex space-x-1 mt-1">
                <div className="w-2 h-2 bg-rose-400 rounded animate-pulse duration-1000"></div>
                <div className="w-2 h-2 bg-rose-500 rounded animate-pulse duration-2000"></div>
                <div className="w-2 h-2 bg-rose-600 rounded animate-pulse duration-3000"></div>
            </div>
        </div>
    ),
    "Making Change": () => (
        <div className="flex items-center space-x-1">
            <div className="w-4 h-4 bg-rose-600 rounded-full flex items-center justify-center text-xs text-white font-bold">¢</div>
            <div className="w-3 h-3 bg-rose-500 rounded-full"></div>
            <div className="w-3 h-3 bg-rose-400 rounded-full"></div>
            <Calculator className="w-5 h-5 text-rose-500 animate-pulse" />
        </div>
    ),
    "Longest Common Subsequence": () => (
        <div className="flex flex-col space-y-1">
            <div className="text-xs text-rose-600 font-mono">ABCD</div>
            <div className="text-xs text-rose-500 font-mono">ACBD</div>
            <div className="text-xs text-rose-700 font-mono underline">A_BD</div>
        </div>
    )
};

const algorithmCategories = [
    {
        name: "Basics",
        color: "bg-blue-500",
        lightColor: "bg-blue-50",
        borderColor: "border-blue-200",
        textColor: "text-blue-700",
        algorithms: [
            "Stack: Array",
            "Stack: Linked List",
            "Queues: Array",
            "Queues: Linked List",
            "Lists: Array",
            "Lists: Linked List"
        ]
    },
    {
        name: "Recursion",
        color: "bg-green-500",
        lightColor: "bg-green-50",
        borderColor: "border-green-200",
        textColor: "text-green-700",
        algorithms: [
            "Factorial",
            "String Reversal",
            "Fibonacci Sequence",
            "N-Queens",
            "Maze Solver",
            "Tower of Hanoi",
        ]
    },
    {
        name: "Indexing",
        color: "bg-purple-500",
        lightColor: "bg-purple-50",
        borderColor: "border-purple-200",
        textColor: "text-purple-700",
        algorithms: [
            "Binary and Linear Search",
            "Binary Search Trees",
            "AVL Trees",
            "Red-Black Trees",
            "Splay Trees",
            "Open Hash Tables",
            "Closed Hash Tables",
            "Closed Hash Tables with Buckets",
            "Trie (Prefix Tree)",
            "Radix Tree",
            "Ternary Search Tree",
            "B Trees",
            "B+ Trees"
        ]
    },
    {
        name: "Sorting",
        color: "bg-orange-500",
        lightColor: "bg-orange-50",
        borderColor: "border-orange-200",
        textColor: "text-orange-700",
        algorithms: [
            "Bubble Sort",
            "Selection Sort",
            "Insertion Sort",
            "Shell Sort",
            "Merge Sort",
            "Quick Sort",
            "Bucket Sort",
            "Counting Sort",
            "Radix Sort",
            "Heap Sort"
        ]
    },
    {
        name: "Searching",
        color: "bg-red-400",
        lightColor: "bg-red-50",
        borderColor: "border-red-200",
        textColor: "text-red-700",
        algorithms: [
            "Binary Search",
            "Linear Search",
            "Jump Search",
            "Interpolation Search",
            "Exponential Search",
            "Fibonacci Search",
            "Ternary Search",
            "Block Search",
        ]
    },
    {
        name: "Heap-like Data Structures",
        color: "bg-amber-500",
        lightColor: "bg-amber-50",
        borderColor: "border-amber-200",
        textColor: "text-amber-700",
        algorithms: [
            "Heaps",
            "Binomial Queues",
            "Fibonacci Heaps",
            "Leftist Heaps",
            "Skew Heaps"
        ]
    },
    {
        name: "Graph Algorithms",
        color: "bg-cyan-500",
        lightColor: "bg-cyan-50",
        borderColor: "border-cyan-200",
        textColor: "text-cyan-700",
        algorithms: [
            "Breadth-First Search",
            "Depth-First Search",
            "Connected Components",
            "Dijkstra's Shortest Path",
            "Prim's Minimum Spanning Tree",
            "Topological Sort (Indegree)",
            "Topological Sort (DFS)",
            "Floyd-Warshall",
            "Kruskal Minimum Spanning Tree"
        ]
    },
    {
        name: "Dynamic Programming",
        color: "bg-rose-500",
        lightColor: "bg-rose-50",
        borderColor: "border-rose-200",
        textColor: "text-rose-700",
        algorithms: [
            "Fibonacci Numbers",
            "Making Change",
            "Longest Common Subsequence"
        ]
    }
];

const AlgorithmsGrid = () => (
    <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    Explore All Algorithms & Data Structures
                </h2>
                <p className="text-xl text-gray-600">
                    Choose from our comprehensive collection with visual representations
                </p>
            </div>

            <div className="space-y-12">
                {algorithmCategories.map((category, categoryIndex) => (
                    <div key={categoryIndex} className="space-y-6">
                        {/* Category Header */}
                        <div className="flex items-center space-x-4">
                            <div className={`w-6 h-6 ${category.color} rounded-lg`}></div>
                            <h3 className={`text-2xl font-bold ${category.textColor}`}>
                                {category.name}
                            </h3>
                            <div className="flex-1 h-0.5 bg-gray-200"></div>
                        </div>

                        {/* Algorithm Tiles */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {category.algorithms.map((algorithm, algorithmIndex) => {
                                const Visual = AlgorithmVisuals[algorithm];
                                return (
                                    <Link
                                        key={algorithmIndex}
                                        href={`/${category.name.toLowerCase().replace(/[:\s]+/g, '-').replace(/[()]/g, '')}/${algorithm.toLowerCase().replace(/[:\s]+/g, '-').replace(/[()]/g, '')}`}
                                        className={`${category.lightColor} ${category.borderColor} border-2 rounded-xl p-4 hover:shadow-lg hover:scale-105 transition-all duration-200 group cursor-pointer`}
                                    >
                                        <div className="flex flex-col items-center space-y-3">
                                            {/* Visual Representation */}
                                            <div className="w-16 h-16 flex items-center justify-center">
                                                {Visual ? <Visual /> : (
                                                    <div className={`w-8 h-8 ${category.color} rounded-lg`}></div>
                                                )}
                                            </div>

                                            {/* Algorithm Name */}
                                            <div className="text-center">
                                                <h4 className={`font-semibold ${category.textColor} text-sm leading-tight`}>
                                                    {algorithm}
                                                </h4>
                                            </div>

                                            {/* Hover Arrow */}
                                            <ArrowRight className={`h-4 w-4 ${category.textColor} opacity-0 group-hover:opacity-100 transition-opacity`} />
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </section>
);

export default AlgorithmsGrid;