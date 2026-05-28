"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import {
    ArrowRight, Layers, RefreshCw, ArrowUpDown, Search,
    GitBranch, Database, Brain, BarChart2, Cpu, Type, GitMerge, TreePine
} from 'lucide-react';

const CATEGORIES = [
    {
        name:        'Basics',
        slug:        'basics',
        icon:        <Layers className="w-6 h-6" />,
        description: 'Stacks, Queues & Linked Lists',
        algorithms:  ['Stack: Array', 'Stack: Linked List', 'Queues: Array', 'Queues: Linked List', 'Lists: Array', 'Lists: Linked List'],
        gradient:    'from-blue-500 to-cyan-500',
        border:      'border-blue-500/30',
        hoverBorder: 'hover:border-blue-400',
        glow:        'hover:shadow-blue-500/20',
        badge:       'bg-blue-500/10 text-blue-300',
    },
    {
        name:        'Recursion',
        slug:        'recursion',
        icon:        <RefreshCw className="w-6 h-6" />,
        description: 'Call Stacks & Backtracking',
        algorithms:  ['Factorial', 'Fibonacci Sequence', 'Tower of Hanoi', 'N-Queens', 'Maze Solver', 'String Reversal'],
        gradient:    'from-emerald-500 to-teal-500',
        border:      'border-emerald-500/30',
        hoverBorder: 'hover:border-emerald-400',
        glow:        'hover:shadow-emerald-500/20',
        badge:       'bg-emerald-500/10 text-emerald-300',
    },
    {
        name:        'Sorting',
        slug:        'sorting',
        icon:        <ArrowUpDown className="w-6 h-6" />,
        description: 'Compare & Swap Algorithms',
        algorithms:  ['Bubble Sort', 'Selection Sort', 'Insertion Sort', 'Merge Sort', 'Quick Sort', 'Heap Sort', 'Radix Sort', 'Bucket Sort'],
        gradient:    'from-orange-500 to-amber-500',
        border:      'border-orange-500/30',
        hoverBorder: 'hover:border-orange-400',
        glow:        'hover:shadow-orange-500/20',
        badge:       'bg-orange-500/10 text-orange-300',
    },
    {
        name:        'Searching',
        slug:        'searching',
        icon:        <Search className="w-6 h-6" />,
        description: 'Find Targets Efficiently',
        algorithms:  ['Binary Search', 'Linear Search', 'Jump Search', 'Interpolation Search', 'Exponential Search', 'Fibonacci Search', 'Ternary Search', 'Block Search'],
        gradient:    'from-red-500 to-rose-500',
        border:      'border-red-500/30',
        hoverBorder: 'hover:border-red-400',
        glow:        'hover:shadow-red-500/20',
        badge:       'bg-red-500/10 text-red-300',
    },
    {
        name:        'Heap Structures',
        slug:        'heap-like-data-structures',
        icon:        <Database className="w-6 h-6" />,
        description: 'Priority Queues & Heapify',
        algorithms:  ['Heaps', 'Binomial Queues', 'Fibonacci Heaps', 'Leftist Heaps', 'Skew Heaps'],
        gradient:    'from-amber-500 to-yellow-500',
        border:      'border-amber-500/30',
        hoverBorder: 'hover:border-amber-400',
        glow:        'hover:shadow-amber-500/20',
        badge:       'bg-amber-500/10 text-amber-300',
    },
    {
        name:        'Dynamic Prog.',
        slug:        'dynamic-programming',
        icon:        <Brain className="w-6 h-6" />,
        description: 'Memoisation & Tabulation',
        algorithms:  ['Fibonacci Numbers', 'Making Change', 'Longest Common Subsequence', '0-1 Knapsack', 'House Robber'],
        gradient:    'from-rose-500 to-pink-600',
        border:      'border-rose-500/30',
        hoverBorder: 'hover:border-rose-400',
        glow:        'hover:shadow-rose-500/20',
        badge:       'bg-rose-500/10 text-rose-300',
    },
    {
        name:        'Graph Algorithms',
        slug:        'graph-algorithms',
        icon:        <GitBranch className="w-6 h-6" />,
        description: 'Traversal & Shortest Paths',
        algorithms:  ['BFS', 'DFS', 'Dijkstra\'s', 'Prim\'s MST', 'Kruskal\'s MST', 'Floyd-Warshall', 'Topological Sort'],
        gradient:    'from-cyan-500 to-sky-600',
        border:      'border-cyan-500/30',
        hoverBorder: 'hover:border-cyan-400',
        glow:        'hover:shadow-cyan-500/20',
        badge:       'bg-cyan-500/10 text-cyan-300',
    },
    {
        name:        'Cheatsheet',
        slug:        'cheatsheet',
        icon:        <BarChart2 className="w-6 h-6" />,
        description: 'Quick Complexity Reference',
        algorithms:  ['Time Complexity', 'Space Complexity', 'Big-O', 'Sorting Table', 'Graph Table', 'Data Structures'],
        gradient:    'from-violet-500 to-indigo-600',
        border:      'border-violet-500/30',
        hoverBorder: 'hover:border-violet-400',
        glow:        'hover:shadow-violet-500/20',
        badge:       'bg-violet-500/10 text-violet-300',
    },
    {
        name:        'Bit Manipulation',
        slug:        'bit-manipulation',
        icon:        <Cpu className="w-6 h-6" />,
        description: 'XOR Tricks & Bitwise Ops',
        algorithms:  ['Single Number (XOR)', 'Count Set Bits', 'Power of Two'],
        gradient:    'from-teal-500 to-cyan-600',
        border:      'border-teal-500/30',
        hoverBorder: 'hover:border-teal-400',
        glow:        'hover:shadow-teal-500/20',
        badge:       'bg-teal-500/10 text-teal-300',
    },
    {
        name:        'String Algorithms',
        slug:        'string-algorithms',
        icon:        <Type className="w-6 h-6" />,
        description: 'Pattern Matching & Hashing',
        algorithms:  ['KMP String Matching', 'Rabin-Karp', 'Z-Algorithm'],
        gradient:    'from-fuchsia-500 to-pink-600',
        border:      'border-fuchsia-500/30',
        hoverBorder: 'hover:border-fuchsia-400',
        glow:        'hover:shadow-fuchsia-500/20',
        badge:       'bg-fuchsia-500/10 text-fuchsia-300',
    },
    {
        name:        'Backtracking',
        slug:        'backtracking',
        icon:        <GitMerge className="w-6 h-6" />,
        description: 'Explore & Prune Search Space',
        algorithms:  ['N-Queens', 'Word Search', 'Rat in a Maze'],
        gradient:    'from-indigo-500 to-purple-600',
        border:      'border-indigo-500/30',
        hoverBorder: 'hover:border-indigo-400',
        glow:        'hover:shadow-indigo-500/20',
        badge:       'bg-indigo-500/10 text-indigo-300',
    },
    {
        name:        'Trees',
        slug:        'trees',
        icon:        <TreePine className="w-6 h-6" />,
        description: 'BST, AVL, Traversals & Tries',
        algorithms:  ['Binary Search Tree', 'AVL Tree', 'Binary Tree Traversals', 'Segment Tree', 'Trie'],
        gradient:    'from-lime-500 to-green-600',
        border:      'border-lime-500/30',
        hoverBorder: 'hover:border-lime-400',
        glow:        'hover:shadow-lime-500/20',
        badge:       'bg-lime-500/10 text-lime-300',
    },
];

function CategoryCard({ cat, index }) {
    const [hovered, setHovered] = useState(false);

    return (
        <Link
            href={`/${cat.slug}`}
            className={`group relative rounded-2xl p-6 bg-slate-900/80 border ${cat.border} ${cat.hoverBorder} hover:shadow-xl ${cat.glow} transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 flex flex-col gap-4 animate-fade-in-up`}
            style={{ animationDelay: `${index * 0.07}s` }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* Top: icon + count */}
            <div className="flex items-start justify-between">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${cat.gradient} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    {cat.icon}
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cat.badge}`}>
                    {cat.algorithms.length} topics
                </span>
            </div>

            {/* Name + description */}
            <div>
                <h3 className="text-white font-bold text-xl mb-1 group-hover:text-white transition-colors">{cat.name}</h3>
                <p className="text-slate-400 text-sm">{cat.description}</p>
            </div>

            {/* Algorithm chips */}
            <div className="flex flex-wrap gap-1.5">
                {cat.algorithms.slice(0, 4).map(a => (
                    <span key={a} className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                        {a}
                    </span>
                ))}
                {cat.algorithms.length > 4 && (
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-500 border border-slate-700">
                        +{cat.algorithms.length - 4} more
                    </span>
                )}
            </div>

            {/* Explore CTA */}
            <div className={`flex items-center gap-2 text-sm font-medium bg-gradient-to-r ${cat.gradient} bg-clip-text text-transparent opacity-80 group-hover:opacity-100 transition-opacity`}>
                Explore
                <ArrowRight className={`w-4 h-4 transition-all duration-200 ${hovered ? 'translate-x-1' : ''}`}
                    style={{ color: 'currentColor' }}
                />
            </div>

            {/* Hover gradient strip at bottom */}
            <div className={`absolute bottom-0 inset-x-0 h-0.5 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r ${cat.gradient}`} />
        </Link>
    );
}

export default function AlgorithmsGrid() {
    return (
        <section id="explore" className="relative bg-slate-950 py-24">
            {/* top separator */}
            <div className="pointer-events-none absolute top-0 inset-x-0 h-px"
                style={{ background: 'linear-gradient(90deg,transparent,#8b5cf6,transparent)' }} />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-14 space-y-4">
                    <span className="inline-block text-xs font-semibold tracking-widest uppercase text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5">
                        All Topics
                    </span>
                    <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
                        Pick your
                        <span
                            className="gradient-text ml-3"
                            style={{ backgroundImage: 'linear-gradient(135deg,#a78bfa,#38bdf8)' }}
                        >
                            starting point
                        </span>
                    </h2>
                    <p className="text-slate-400 text-lg max-w-xl mx-auto">
                        12 categories, 55+ algorithms — each with animations, explanations, and code.
                    </p>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {CATEGORIES.map((cat, i) => (
                        <CategoryCard key={cat.slug} cat={cat} index={i} />
                    ))}
                </div>
            </div>
        </section>
    );
}
