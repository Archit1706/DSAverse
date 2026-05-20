import React from 'react';
import Link from 'next/link';
import { Play, Code, Clock, Layers, GitMerge, Zap, Triangle } from 'lucide-react';

export const metadata = {
    title: "Heap-like Data Structures – Binary Heap, Fibonacci Heap & More",
    description:
        "Visualize heap-like data structures: Binary Heaps (min/max), Binomial Queues, Fibonacci Heaps, Leftist Heaps, and Skew Heaps. See insert, extract-min/max, and heapify operations animated.",
    keywords: ["binary heap", "min heap", "max heap", "fibonacci heap", "binomial queue", "leftist heap", "skew heap", "priority queue", "data structure visualization"],
    openGraph: {
        title: "Heap Data Structures Visualizer – DSAverse",
        description: "Interactive animations for binary heaps, fibonacci heaps, and other heap variants.",
        images: [{ url: "/og-image.png" }],
    },
};

const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
        case 'Beginner':     return 'bg-green-500/15 text-green-400';
        case 'Intermediate': return 'bg-yellow-500/15 text-yellow-400';
        case 'Advanced':     return 'bg-red-500/15 text-red-400';
        default:             return 'bg-slate-700 text-slate-300';
    }
};

const heapDataStructures = [
    {
        name: "Heaps",
        slug: "heaps",
        description: "Complete binary tree with heap property — parent is always ≥ (max-heap) or ≤ (min-heap) its children. Array-based implementation with O(1) peek.",
        timeComplexity: "O(log n)",
        spaceComplexity: "O(n)",
        difficulty: "Intermediate",
        icon: <Layers className="h-7 w-7" />,
        applications: ["Priority Queues", "Heap Sort", "Dijkstra's Algorithm"],
        operations: ["Insert: O(log n)", "Extract: O(log n)", "Peek: O(1)"]
    },
    {
        name: "Binomial Queues",
        slug: "binomial-queues",
        description: "Forest of binomial trees with unique ranks. Merging works like binary addition — two trees of the same rank merge into one of the next rank.",
        timeComplexity: "O(log n)",
        spaceComplexity: "O(n)",
        difficulty: "Advanced",
        icon: <GitMerge className="h-7 w-7" />,
        applications: ["Union-Find", "External Sorting", "Parallel Algorithms"],
        operations: ["Insert: O(1)*", "Extract Min: O(log n)", "Merge: O(log n)"]
    },
    {
        name: "Fibonacci Heaps",
        slug: "fibonacci-heaps",
        description: "Lazy heap where insert adds a singleton tree to the root list. Consolidation is deferred until extract-min, giving O(1) amortized insert and decrease-key.",
        timeComplexity: "O(1)*",
        spaceComplexity: "O(n)",
        difficulty: "Advanced",
        icon: <Zap className="h-7 w-7" />,
        applications: ["Prim's Algorithm", "Dijkstra's Algorithm", "Network Optimization"],
        operations: ["Insert: O(1)", "Decrease Key: O(1)*", "Extract Min: O(log n)*"]
    },
    {
        name: "Leftist Heaps",
        slug: "leftist-heaps",
        description: "Binary heap where npl(left) ≥ npl(right) at every node. The right spine is kept short (O(log n)), and all operations reduce to a single merge primitive.",
        timeComplexity: "O(log n)",
        spaceComplexity: "O(n)",
        difficulty: "Advanced",
        icon: <Triangle className="h-7 w-7" />,
        applications: ["Mergeable Priority Queues", "Event Simulation", "Persistent Structures"],
        operations: ["Merge: O(log n)", "Insert: O(log n)", "Extract Min: O(log n)"]
    },
    {
        name: "Skew Heaps",
        slug: "skew-heaps",
        description: "Self-adjusting version of the leftist heap. No npl stored — children are unconditionally swapped on every merge step, achieving amortized O(log n) without bookkeeping.",
        timeComplexity: "O(log n)*",
        spaceComplexity: "O(n)",
        difficulty: "Advanced",
        icon: <Layers className="h-7 w-7" />,
        applications: ["Simple Mergeable Heaps", "Functional Programming", "Educational Uses"],
        operations: ["Merge: O(log n)*", "Insert: O(log n)*", "Extract Min: O(log n)*"]
    }
];

export default function HeapLikeDataStructuresPage() {
    return (
        <div className="min-h-screen bg-slate-950">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="text-center">
                        <h1 className="text-4xl md:text-6xl font-bold mb-6">
                            Heap-like Data Structures
                        </h1>
                        <p className="text-xl text-amber-100 mb-8 max-w-3xl mx-auto">
                            Explore priority queue implementations — from classic binary heaps to advanced
                            mergeable structures. Visualize insert, extract, and merge operations step by step.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                                <Play className="h-4 w-4" /> Interactive Visualizations
                            </div>
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                                <Code className="h-4 w-4" /> Implementation Details
                            </div>
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                                <Clock className="h-4 w-4" /> Complexity Analysis
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Cards Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {heapDataStructures.map((structure, index) => (
                        <Link key={index} href={`/heap-like-data-structures/${structure.slug}`}
                            className="h-full flex flex-col group">
                            <div className="h-full flex flex-col bg-slate-900/70 rounded-xl border border-slate-700/50 hover:border-amber-500/50 shadow-xl transition-all duration-300 overflow-hidden cursor-pointer">
                                {/* Card header */}
                                <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-5 text-white">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="text-amber-100">{structure.icon}</div>
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getDifficultyColor(structure.difficulty)}`}>
                                            {structure.difficulty}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-bold mb-1.5 group-hover:text-amber-100 transition-colors">
                                        {structure.name}
                                    </h3>
                                    <p className="text-amber-100 text-sm leading-relaxed">
                                        {structure.description}
                                    </p>
                                </div>

                                {/* Card body */}
                                <div className="flex-1 flex flex-col p-5">
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <div className="text-center">
                                            <div className="text-base font-bold text-amber-400">{structure.timeComplexity}</div>
                                            <div className="text-xs text-slate-400">Time</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-base font-bold text-amber-400">{structure.spaceComplexity}</div>
                                            <div className="text-xs text-slate-400">Space</div>
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wide mb-2">Key Operations</h4>
                                        <div className="space-y-1">
                                            {structure.operations.map((op, idx) => (
                                                <div key={idx} className="flex items-center gap-2 text-xs text-slate-400">
                                                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full flex-shrink-0" />
                                                    {op}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wide mb-2">Applications</h4>
                                        <div className="space-y-1">
                                            {structure.applications.map((app, idx) => (
                                                <div key={idx} className="flex items-center gap-2 text-xs text-slate-400">
                                                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full flex-shrink-0" />
                                                    {app}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="mt-auto pt-4 border-t border-slate-700/50 flex items-center justify-between">
                                        <span className="text-sm font-medium text-amber-400 group-hover:text-amber-300 transition-colors">
                                            Explore →
                                        </span>
                                        <Play className="h-4 w-4 text-amber-500" />
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Info Sections */}
                <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                        <h2 className="text-xl font-bold text-white mb-4">Why Learn Heap Structures?</h2>
                        <p className="text-sm text-slate-400 leading-relaxed mb-4">
                            Heap-like structures power priority-based operations and are fundamental
                            to graph algorithms, OS scheduling, and real-time systems.
                        </p>
                        <ul className="space-y-2 text-sm text-slate-400">
                            {['Core of priority queue implementations', "Critical for Dijkstra's and Prim's", 'Efficient merge for event simulation'].map(p => (
                                <li key={p} className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full flex-shrink-0" />{p}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                        <h2 className="text-xl font-bold text-white mb-4">Recommended Path</h2>
                        <div className="space-y-3">
                            {['Start with Binary Heaps', 'Understand Binomial Queues', 'Explore Leftist Heaps', 'Study Skew Heaps', 'Master Fibonacci Heaps'].map((step, i) => (
                                <div key={i} className="flex items-center gap-3 text-sm text-slate-400">
                                    <span className="w-6 h-6 bg-amber-500/15 text-amber-400 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                                        {i + 1}
                                    </span>
                                    {step}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6">
                        <h2 className="text-xl font-bold text-white mb-4">Key Concepts</h2>
                        <div className="space-y-4">
                            {[
                                ['Heap Property', 'Parent-child ordering guarantees O(1) min/max access'],
                                ['Merge Operations', 'Combining two heaps efficiently — the distinguishing feature'],
                                ['Amortized Analysis', 'Average cost over a sequence of operations, not worst case alone'],
                            ].map(([title, desc]) => (
                                <div key={title} className="border-l-4 border-amber-500 pl-3">
                                    <h3 className="font-semibold text-slate-100 text-sm">{title}</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Comparison Table */}
                <div className="mt-12 bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-8">
                    <h2 className="text-2xl font-bold text-white mb-6 text-center">Quick Comparison</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b-2 border-slate-700/50">
                                    <th className="text-left py-3 px-4 font-semibold text-slate-100">Structure</th>
                                    <th className="text-center py-3 px-4 font-semibold text-amber-400">Insert</th>
                                    <th className="text-center py-3 px-4 font-semibold text-amber-400">Extract Min</th>
                                    <th className="text-center py-3 px-4 font-semibold text-amber-400">Merge</th>
                                    <th className="text-center py-3 px-4 font-semibold text-amber-400">Best Use Case</th>
                                </tr>
                            </thead>
                            <tbody className="text-slate-400">
                                {[
                                    ['Binary Heap', 'O(log n)', 'O(log n)', 'O(n)', 'Simple priority queues'],
                                    ['Binomial Queue', 'O(1)*', 'O(log n)', 'O(log n)', 'Frequent merging'],
                                    ['Fibonacci Heap', 'O(1)', 'O(log n)*', 'O(1)', 'Graph algorithms'],
                                    ['Leftist Heap', 'O(log n)', 'O(log n)', 'O(log n)', 'Persistent structures'],
                                    ['Skew Heap', 'O(log n)*', 'O(log n)*', 'O(log n)*', 'Simple implementation'],
                                ].map(([name, ins, ext, merge, use], i) => (
                                    <tr key={name} className={i < 4 ? 'border-b border-slate-700/50' : ''}>
                                        <td className="py-3 px-4 font-medium text-slate-200">{name}</td>
                                        <td className="py-3 px-4 text-center">{ins}</td>
                                        <td className="py-3 px-4 text-center">{ext}</td>
                                        <td className="py-3 px-4 text-center">{merge}</td>
                                        <td className="py-3 px-4 text-center">{use}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <p className="mt-4 text-xs text-slate-500 text-center">* Amortized time complexity</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
