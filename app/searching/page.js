import React from 'react';
import Link from 'next/link';
import { Clock, Code, Play, Search, Target, Zap, TrendingUp, BarChart2, Hash } from 'lucide-react';

export const metadata = {
    title: "Searching Algorithms – Visualizer & Complexity Guide",
    description:
        "Interactive visualizations for 8 searching algorithms: Binary Search, Linear Search, Jump Search, Interpolation Search, Exponential Search, Fibonacci Search, Ternary Search, and Block Search.",
    keywords: ["searching algorithms", "binary search", "linear search", "jump search", "interpolation search", "algorithm visualization"],
    openGraph: {
        title: "Searching Algorithms Visualizer – DSAverse",
        description: "Step-by-step interactive searching algorithm visualizations with complexity analysis.",
        images: [{ url: "/og-image.png" }],
    },
};

const searchingAlgorithms = [
    {
        name: "Linear Search",
        slug: "linear-search",
        icon: Search,
        description: "Sequential scan through every element until the target is found. Works on any array — sorted or unsorted — and finds all occurrences in one pass.",
        timeComplexity: "O(n)",
        spaceComplexity: "O(1)",
        difficulty: "Beginner",
        requirement: "None",
    },
    {
        name: "Binary Search",
        slug: "binary-search",
        icon: Target,
        description: "Repeatedly halves the search space by comparing the target with the midpoint element. The gold standard for searching sorted arrays.",
        timeComplexity: "O(log n)",
        spaceComplexity: "O(1)",
        difficulty: "Beginner",
        requirement: "Sorted Array",
    },
    {
        name: "Jump Search",
        slug: "jump-search",
        icon: Zap,
        description: "Jumps ahead in steps of √n to find the right block, then scans linearly within that block. A practical middle-ground between linear and binary.",
        timeComplexity: "O(√n)",
        spaceComplexity: "O(1)",
        difficulty: "Intermediate",
        requirement: "Sorted Array",
    },
    {
        name: "Interpolation Search",
        slug: "interpolation-search",
        icon: TrendingUp,
        description: "Estimates the target's position using value proportions — like looking up a name in a phone book. Excels on uniformly distributed data.",
        timeComplexity: "O(log log n)",
        spaceComplexity: "O(1)",
        difficulty: "Intermediate",
        requirement: "Sorted & Uniform",
    },
    {
        name: "Exponential Search",
        slug: "exponential-search",
        icon: BarChart2,
        description: "Doubles the bound (1 → 2 → 4 → 8 …) to find a range where the target lies, then applies binary search within that range.",
        timeComplexity: "O(log n)",
        spaceComplexity: "O(1)",
        difficulty: "Intermediate",
        requirement: "Sorted Array",
    },
    {
        name: "Fibonacci Search",
        slug: "fibonacci-search",
        icon: Hash,
        description: "Divides the array using Fibonacci numbers. Avoids division entirely — uses only addition and subtraction to compute probe positions.",
        timeComplexity: "O(log n)",
        spaceComplexity: "O(1)",
        difficulty: "Advanced",
        requirement: "Sorted Array",
    },
    {
        name: "Ternary Search",
        slug: "ternary-search",
        icon: Search,
        description: "Splits the range into three equal thirds using two midpoints, eliminating one third per iteration. An interesting theoretical variant of binary search.",
        timeComplexity: "O(log₃ n)",
        spaceComplexity: "O(1)",
        difficulty: "Advanced",
        requirement: "Sorted Array",
    },
    {
        name: "Block Search",
        slug: "block-search",
        icon: Zap,
        description: "Scans block endpoints in steps of √n to identify the correct block, then searches linearly within it. Also known as Jump Search.",
        timeComplexity: "O(√n)",
        spaceComplexity: "O(1)",
        difficulty: "Intermediate",
        requirement: "Sorted Array",
    },
];

const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
        case 'Beginner':     return 'bg-green-500/15 text-green-400';
        case 'Intermediate': return 'bg-yellow-500/15 text-yellow-400';
        case 'Advanced':     return 'bg-red-500/15 text-red-400';
        default:             return 'bg-slate-700/60 text-slate-400';
    }
};

const getRequirementColor = (req) => {
    if (req === 'None') return 'bg-green-500/15 text-green-400';
    if (req === 'Sorted & Uniform') return 'bg-purple-500/15 text-purple-400';
    return 'bg-yellow-500/15 text-yellow-400';
};

export default function SearchingPage() {
    return (
        <div className="min-h-screen bg-slate-950">

            {/* ── Header ── */}
            <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="text-center">
                        <h1 className="text-4xl md:text-6xl font-bold mb-6">
                            Searching Algorithms
                        </h1>
                        <p className="text-xl text-red-100 mb-8 max-w-3xl mx-auto">
                            Master the art of finding elements efficiently. From simple linear scans
                            to logarithmic divide-and-conquer — visualize every comparison step by step.
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

            {/* ── Algorithm Grid ── */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {searchingAlgorithms.map((algorithm) => {
                        const Icon = algorithm.icon;
                        return (
                            <Link
                                key={algorithm.slug}
                                href={`/searching/${algorithm.slug}`}
                                className="h-full flex flex-col"
                            >
                                <div className="h-full flex flex-col bg-slate-900/70 rounded-xl border border-slate-700/50 hover:shadow-xl transition-all duration-300 hover:scale-105 hover:border-red-500/50 overflow-hidden">

                                    {/* Card header */}
                                    <div className="bg-gradient-to-br from-red-600 to-rose-700 p-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <Icon className="h-5 w-5 text-white" />
                                            </div>
                                            <h3 className="text-xl font-bold text-white">{algorithm.name}</h3>
                                        </div>
                                    </div>

                                    {/* Card body */}
                                    <div className="p-6 flex-1 flex flex-col">
                                        <p className="text-slate-400 mb-4 text-sm leading-relaxed flex-1">
                                            {algorithm.description}
                                        </p>

                                        <div className="space-y-3 mt-auto">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium text-slate-300">Time Complexity:</span>
                                                <code className="bg-red-500/15 text-red-400 px-2 py-1 rounded text-sm font-mono">
                                                    {algorithm.timeComplexity}
                                                </code>
                                            </div>

                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium text-slate-300">Space Complexity:</span>
                                                <code className="bg-red-500/15 text-red-400 px-2 py-1 rounded text-sm font-mono">
                                                    {algorithm.spaceComplexity}
                                                </code>
                                            </div>

                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium text-slate-300">Difficulty:</span>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(algorithm.difficulty)}`}>
                                                    {algorithm.difficulty}
                                                </span>
                                            </div>

                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium text-slate-300">Requires:</span>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRequirementColor(algorithm.requirement)}`}>
                                                    {algorithm.requirement}
                                                </span>
                                            </div>

                                            <button className="w-full mt-4 bg-gradient-to-r from-red-600 to-rose-600 text-white px-4 py-2 rounded-lg font-medium hover:from-red-700 hover:to-rose-700 transition-all duration-200 flex items-center justify-center gap-2">
                                                <Play className="h-4 w-4" />
                                                Start Visualization
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* ── Info Section ── */}
            <div className="bg-slate-900/70 border-t border-slate-700/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-white mb-4">
                            Why Learn Searching Algorithms?
                        </h2>
                        <p className="text-xl text-slate-400 max-w-3xl mx-auto">
                            Searching is one of the most fundamental operations in programming.
                            Choosing the right algorithm can be the difference between milliseconds and minutes.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="text-center p-6">
                            <div className="w-16 h-16 bg-red-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="h-8 w-8 text-red-500" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2 text-white">Fundamental Skill</h3>
                            <p className="text-slate-400">
                                Searching underpins databases, file systems, and nearly every application.
                                Understanding the trade-offs helps you pick the right tool every time.
                            </p>
                        </div>

                        <div className="text-center p-6">
                            <div className="w-16 h-16 bg-red-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Zap className="h-8 w-8 text-red-500" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2 text-white">Performance Impact</h3>
                            <p className="text-slate-400">
                                From O(n) to O(log log n) — algorithm choice dramatically affects speed,
                                especially at scale. Switching to binary search can cut millions of comparisons.
                            </p>
                        </div>

                        <div className="text-center p-6">
                            <div className="w-16 h-16 bg-red-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                                <TrendingUp className="h-8 w-8 text-red-500" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2 text-white">Real-world Applications</h3>
                            <p className="text-slate-400">
                                Binary search powers database indexes. Interpolation search models phone-book
                                lookups. Exponential search handles infinite or unbounded data streams.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
