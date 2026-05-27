import React from 'react';
import Link from 'next/link';
import { Clock, Code, Play, ArrowLeftRight, BarChart2, AlignLeft, Zap, TrendingUp, Layers, Filter } from 'lucide-react';

export const metadata = {
    title: "Two Pointers & Sliding Window – Visualizer & Complexity Guide",
    description:
        "Interactive visualizations for two pointers and sliding window patterns: Two Sum II, Valid Palindrome, Maximum Sum Subarray, and Longest Substring Without Repeating Characters.",
    keywords: ["two pointers", "sliding window", "two sum", "valid palindrome", "maximum sum subarray", "longest substring", "algorithm visualization"],
    openGraph: {
        title: "Two Pointers & Sliding Window Visualizer – DSAverse",
        description: "Step-by-step interactive two pointers and sliding window visualizations with complexity analysis.",
        images: [{ url: "/og-image.png" }],
    },
};

const twoPointersAlgorithms = [
    {
        name: "Two Sum II",
        slug: "two-sum-ii",
        icon: ArrowLeftRight,
        description: "Classic two-pointer technique on a sorted array. Place one pointer at each end and converge inward, eliminating half the search space at every step.",
        timeComplexity: "O(n)",
        spaceComplexity: "O(1)",
        difficulty: "Beginner",
        pattern: "Two Pointers",
    },
    {
        name: "Valid Palindrome",
        slug: "valid-palindrome",
        icon: ArrowLeftRight,
        description: "Verify a string reads the same forwards and backwards by comparing characters from both ends, skipping non-alphanumeric characters.",
        timeComplexity: "O(n)",
        spaceComplexity: "O(1)",
        difficulty: "Beginner",
        pattern: "Two Pointers",
    },
    {
        name: "Maximum Sum Subarray",
        slug: "maximum-sum-subarray",
        icon: BarChart2,
        description: "Find the contiguous subarray of length k with the largest sum using a fixed-size sliding window that shifts one position at a time.",
        timeComplexity: "O(n)",
        spaceComplexity: "O(1)",
        difficulty: "Intermediate",
        pattern: "Fixed Window",
    },
    {
        name: "Longest Substring Without Repeating Characters",
        slug: "longest-substring-without-repeating-characters",
        icon: AlignLeft,
        description: "Expand the window rightward adding new characters; shrink from the left whenever a duplicate is detected. The window always holds a valid unique-character substring.",
        timeComplexity: "O(n)",
        spaceComplexity: "O(k)",
        difficulty: "Intermediate",
        pattern: "Dynamic Window",
    },
    {
        name: "Container With Most Water",
        slug: "container-with-most-water",
        icon: Layers,
        description: "Given bar heights, find two bars that trap the most water. Two pointers converge inward, always moving the shorter bar — watch the water area update in real time.",
        timeComplexity: "O(n)",
        spaceComplexity: "O(1)",
        difficulty: "Intermediate",
        pattern: "Two Pointers",
    },
    {
        name: "3Sum",
        slug: "3sum",
        icon: ArrowLeftRight,
        description: "Sort the array, fix a pivot, then run a two-pointer sweep on the remainder. Duplicate pivots and duplicate pairs are skipped to produce a unique set of triplets.",
        timeComplexity: "O(n²)",
        spaceComplexity: "O(1)",
        difficulty: "Intermediate",
        pattern: "Two Pointers",
    },
    {
        name: "Minimum Window Substring",
        slug: "minimum-window-substring",
        icon: Filter,
        description: "Expand the right pointer until the window contains all required characters, then shrink from the left to find the tightest valid window. Track character frequencies to detect validity in O(1).",
        timeComplexity: "O(n + m)",
        spaceComplexity: "O(m)",
        difficulty: "Advanced",
        pattern: "Dynamic Window",
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

const getPatternColor = (pattern) => {
    switch (pattern) {
        case 'Two Pointers':   return 'bg-violet-500/15 text-violet-400';
        case 'Fixed Window':   return 'bg-blue-500/15 text-blue-400';
        case 'Dynamic Window': return 'bg-orange-500/15 text-orange-400';
        default:               return 'bg-slate-700/60 text-slate-400';
    }
};

export default function TwoPointersPage() {
    return (
        <div className="min-h-screen bg-slate-950">

            {/* Header */}
            <div className="bg-gradient-to-r from-violet-600 to-purple-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="text-center">
                        <h1 className="text-4xl md:text-6xl font-bold mb-6">
                            Two Pointers &amp; Sliding Window
                        </h1>
                        <p className="text-xl text-violet-100 mb-8 max-w-3xl mx-auto">
                            Master linear-time array and string techniques. Two pointers converge from both ends;
                            sliding windows expand and contract to maintain invariants — both avoid nested loops entirely.
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

            {/* Algorithm Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {twoPointersAlgorithms.map((algorithm) => {
                        const Icon = algorithm.icon;
                        return (
                            <Link
                                key={algorithm.slug}
                                href={`/two-pointers-and-sliding-window/${algorithm.slug}`}
                                className="h-full flex flex-col"
                            >
                                <div className="h-full flex flex-col bg-slate-900/70 rounded-xl border border-slate-700/50 hover:shadow-xl transition-all duration-300 hover:scale-105 hover:border-violet-500/50 overflow-hidden">

                                    {/* Card header */}
                                    <div className="bg-gradient-to-br from-violet-600 to-purple-700 p-6">
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
                                                <code className="bg-violet-500/15 text-violet-400 px-2 py-1 rounded text-sm font-mono">
                                                    {algorithm.timeComplexity}
                                                </code>
                                            </div>

                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium text-slate-300">Space Complexity:</span>
                                                <code className="bg-violet-500/15 text-violet-400 px-2 py-1 rounded text-sm font-mono">
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
                                                <span className="text-sm font-medium text-slate-300">Pattern:</span>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPatternColor(algorithm.pattern)}`}>
                                                    {algorithm.pattern}
                                                </span>
                                            </div>

                                            <button className="w-full mt-4 bg-gradient-to-r from-violet-600 to-purple-700 text-white px-4 py-2 rounded-lg font-medium hover:from-violet-700 hover:to-purple-800 transition-all duration-200 flex items-center justify-center gap-2">
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

            {/* Info Section */}
            <div className="bg-slate-900/70 border-t border-slate-700/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-white mb-4">
                            Why Learn Two Pointers &amp; Sliding Window?
                        </h2>
                        <p className="text-xl text-slate-400 max-w-3xl mx-auto">
                            These patterns transform brute-force O(n²) solutions into elegant O(n) ones.
                            They appear constantly in interviews and are foundational for array and string problems.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="text-center p-6">
                            <div className="w-16 h-16 bg-violet-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                                <ArrowLeftRight className="h-8 w-8 text-violet-500" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2 text-white">Linear Time Solutions</h3>
                            <p className="text-slate-400">
                                Replace nested loops with smart pointer movement. Both patterns achieve O(n) by
                                ensuring each element is visited at most twice — once when added, once when removed.
                            </p>
                        </div>

                        <div className="text-center p-6">
                            <div className="w-16 h-16 bg-violet-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Zap className="h-8 w-8 text-violet-500" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2 text-white">Interview Staples</h3>
                            <p className="text-slate-400">
                                Two pointers and sliding window appear in dozens of popular LeetCode problems.
                                Recognizing the pattern instantly gives you a clear solution path under pressure.
                            </p>
                        </div>

                        <div className="text-center p-6">
                            <div className="w-16 h-16 bg-violet-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                                <TrendingUp className="h-8 w-8 text-violet-500" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2 text-white">Real-world Applications</h3>
                            <p className="text-slate-400">
                                Network packet buffering, stream processing, substring matching in text editors,
                                and DNA sequence analysis all rely on sliding window techniques at their core.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
