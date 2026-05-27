import React from 'react';
import Link from 'next/link';
import { Play, Clock, Code, Brain, Zap, Target, Sigma, Coins, AlignLeft, Package, Home, TrendingUp, Edit3, BarChart2, Layers } from 'lucide-react';

export const metadata = {
    title: "Dynamic Programming – Interactive Visualizer",
    description:
        "Visualize classic dynamic programming problems: Fibonacci Numbers, Making Change, Longest Common Subsequence, 0-1 Knapsack, and House Robber. Understand memoization and tabulation with animations.",
    keywords: ["dynamic programming", "DP", "fibonacci", "knapsack problem", "LCS", "memoization", "tabulation", "algorithm visualization"],
    openGraph: {
        title: "Dynamic Programming Visualizer – DSAverse",
        description: "Interactive step-by-step dynamic programming visualizations with subproblem breakdowns.",
        images: [{ url: "/og-image.png" }],
    },
};

const dpAlgorithms = [
    {
        name: "Fibonacci Numbers",
        slug: "fibonacci-numbers",
        icon: Sigma,
        description: "Classic example of memoization transforming exponential time complexity into linear by caching previously computed values in the recursion tree.",
        timeComplexity: "O(n)",
        spaceComplexity: "O(n)",
        difficulty: "Beginner",
        type: "Top-down DP",
        pattern: "Memoization",
        available: true,
    },
    {
        name: "Making Change",
        slug: "making-change",
        icon: Coins,
        description: "Find the minimum number of coins needed to make a target amount using bottom-up tabulation. Classic unbounded knapsack pattern.",
        timeComplexity: "O(amount × coins)",
        spaceComplexity: "O(amount)",
        difficulty: "Intermediate",
        type: "Bottom-up DP",
        pattern: "Unbounded Knapsack",
        available: true,
    },
    {
        name: "Longest Common Subsequence",
        slug: "largest-common-subsequence",
        icon: AlignLeft,
        description: "2D DP table approach to find the longest subsequence common to two strings. Foundation for diff tools, version control, and DNA analysis.",
        timeComplexity: "O(m × n)",
        spaceComplexity: "O(m × n)",
        difficulty: "Intermediate",
        type: "2D DP Table",
        pattern: "String Matching",
        available: true,
    },
    {
        name: "0/1 Knapsack",
        slug: "0-1-knapsack",
        icon: Package,
        description: "Classic optimization problem using 2D DP to maximize total value within a weight capacity, where each item can be taken at most once.",
        timeComplexity: "O(n × W)",
        spaceComplexity: "O(n × W)",
        difficulty: "Intermediate",
        type: "2D DP Table",
        pattern: "Optimization",
        available: true,
    },
    {
        name: "House Robber",
        slug: "house-robber",
        icon: Home,
        description: "Maximize money robbed from a street of houses with the constraint that no two adjacent houses can be robbed. Elegant 1D DP solution.",
        timeComplexity: "O(n)",
        spaceComplexity: "O(1)",
        difficulty: "Beginner",
        type: "1D DP Array",
        pattern: "Decision Making",
        available: true,
    },
    {
        name: "Longest Increasing Subsequence",
        slug: "longest-increasing-subsequence",
        icon: TrendingUp,
        description: "Find the length of the longest strictly increasing subsequence in an array. Can be solved in O(n²) with DP or O(n log n) with patience sorting.",
        timeComplexity: "O(n²) / O(n log n)",
        spaceComplexity: "O(n)",
        difficulty: "Intermediate",
        type: "1D DP Array",
        pattern: "Subsequence",
        available: true,
    },
    {
        name: "Edit Distance",
        slug: "edit-distance",
        icon: Edit3,
        description: "Minimum number of insertions, deletions, and substitutions to transform one string into another. Foundation of spell checkers and autocorrect.",
        timeComplexity: "O(m × n)",
        spaceComplexity: "O(m × n)",
        difficulty: "Advanced",
        type: "2D DP Table",
        pattern: "String Transformation",
        available: true,
    },
    {
        name: "Matrix Chain Multiplication",
        slug: "matrix-chain-multiplication",
        icon: Layers,
        description: "Find the optimal parenthesization of a matrix chain to minimize scalar multiplications. Classic interval DP — the table fills diagonally by chain length.",
        timeComplexity: "O(n³)",
        spaceComplexity: "O(n²)",
        difficulty: "Advanced",
        type: "Interval DP",
        pattern: "Optimization",
        available: true,
    },
    {
        name: "Maximum Subarray",
        slug: "maximum-subarray",
        icon: BarChart2,
        description: "Kadane's algorithm finds the contiguous subarray with maximum sum in linear time — a beautiful example of optimized DP.",
        timeComplexity: "O(n)",
        spaceComplexity: "O(1)",
        difficulty: "Beginner",
        type: "Optimized DP",
        pattern: "Subarray",
        available: false,
    }
];

const getDifficultyColor = (d) => {
    if (d === 'Beginner') return 'bg-green-500/15 text-green-400';
    if (d === 'Intermediate') return 'bg-yellow-500/15 text-yellow-400';
    return 'bg-red-500/15 text-red-400';
};

const getPatternColor = (p) => {
    const map = {
        'Memoization': 'bg-purple-500/15 text-purple-400',
        'Unbounded Knapsack': 'bg-blue-500/15 text-blue-400',
        'String Matching': 'bg-rose-500/15 text-rose-400',
        'Optimization': 'bg-orange-500/15 text-orange-400',
        'Subsequence': 'bg-blue-500/15 text-blue-400',
        'String Transformation': 'bg-purple-500/15 text-purple-400',
        'Subarray': 'bg-teal-500/15 text-teal-400',
        'Interval DP': 'bg-violet-500/15 text-violet-400',
        'Decision Making': 'bg-green-500/15 text-green-400',
    };
    return map[p] || 'bg-slate-700 text-slate-300';
};

export default function DynamicProgrammingPage() {
    return (
        <div className="min-h-screen bg-slate-950">
            {/* Header */}
            <div className="bg-gradient-to-r from-rose-600 to-pink-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="text-center">
                        <h1 className="text-4xl md:text-6xl font-bold mb-6">Dynamic Programming</h1>
                        <p className="text-xl text-rose-100 mb-8 max-w-3xl mx-auto">
                            Master the art of solving complex problems by breaking them into overlapping subproblems.
                            Watch memoization and tabulation transform exponential algorithms into polynomial ones.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full"><Play className="h-4 w-4" />Interactive Visualizations</div>
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full"><Target className="h-4 w-4" />State Transitions</div>
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full"><Zap className="h-4 w-4" />Optimization Techniques</div>
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full"><Code className="h-4 w-4" />Multiple Approaches</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* DP Core Concepts */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                    {[
                        { icon: Brain, title: "Optimal Substructure", body: "Solutions to larger problems depend on optimal solutions to smaller subproblems — the foundation of DP." },
                        { icon: Target, title: "Overlapping Subproblems", body: "The same subproblems are solved multiple times in a naive recursion — memoization eliminates this waste." },
                        { icon: Zap, title: "Memoization vs Tabulation", body: "Top-down caches results as they're computed; bottom-up fills a table iteratively from the base case up." },
                    ].map(c => (
                        <div key={c.title} className="bg-slate-900/70 rounded-xl p-6 border border-slate-700/50 text-center">
                            <div className="w-14 h-14 bg-rose-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                                <c.icon className="h-7 w-7 text-rose-500" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2 text-white">{c.title}</h3>
                            <p className="text-slate-400 text-sm">{c.body}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Algorithms Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-white mb-3">Interactive DP Visualizations</h2>
                    <p className="text-slate-400">Explore classic dynamic programming problems with step-by-step animations</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {dpAlgorithms.map((algo) => {
                        const Icon = algo.icon;
                        const card = (
                            <div className="h-full flex flex-col bg-slate-900/70 rounded-xl border border-slate-700/50 hover:shadow-xl transition-all duration-300 hover:scale-105 hover:border-rose-500/50 overflow-hidden">
                                <div className={`bg-gradient-to-br from-rose-600 to-pink-700 p-6 ${!algo.available ? 'opacity-60' : ''}`}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <Icon className="h-5 w-5 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white leading-tight">{algo.name}</h3>
                                            {!algo.available && <span className="text-xs text-rose-200/70">Coming Soon</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className={`p-6 flex-1 flex flex-col ${!algo.available ? 'opacity-60' : ''}`}>
                                    <p className="text-slate-400 text-sm leading-relaxed flex-1 mb-4">{algo.description}</p>
                                    <div className="space-y-2 mt-auto">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-medium text-slate-400">Time:</span>
                                            <code className="bg-rose-500/15 text-rose-400 px-2 py-0.5 rounded text-xs">{algo.timeComplexity}</code>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-medium text-slate-400">Space:</span>
                                            <code className="bg-rose-500/15 text-rose-400 px-2 py-0.5 rounded text-xs">{algo.spaceComplexity}</code>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-medium text-slate-400">Difficulty:</span>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(algo.difficulty)}`}>{algo.difficulty}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-medium text-slate-400">Pattern:</span>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPatternColor(algo.pattern)}`}>{algo.pattern}</span>
                                        </div>
                                        <div className="pt-2">
                                            {algo.available ? (
                                                <div className="w-full bg-gradient-to-r from-rose-600 to-pink-600 text-white px-4 py-2 rounded-lg font-medium hover:from-rose-700 hover:to-pink-700 transition-all duration-200 flex items-center justify-center gap-2 text-sm">
                                                    <Play className="h-4 w-4" />Start Visualization
                                                </div>
                                            ) : (
                                                <div className="w-full bg-slate-700/50 text-slate-500 px-4 py-2 rounded-lg font-medium flex items-center justify-center text-sm cursor-not-allowed">
                                                    Coming Soon
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );

                        return algo.available ? (
                            <Link key={algo.slug} href={`/dynamic-programming/${algo.slug}`} className="h-full flex flex-col">{card}</Link>
                        ) : (
                            <div key={algo.slug} className="h-full flex flex-col">{card}</div>
                        );
                    })}
                </div>
            </div>

            {/* DP Approaches */}
            <div className="bg-slate-900/70 border-t border-slate-700/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <h2 className="text-3xl font-bold text-white mb-3 text-center">Two DP Paradigms</h2>
                    <p className="text-slate-400 text-center mb-12">Learn when to use each approach</p>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-purple-500/10 rounded-xl p-8 border border-purple-500/20">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center"><Brain className="h-6 w-6 text-white" /></div>
                                <div><h3 className="text-xl font-bold text-purple-300">Top-down — Memoization</h3><p className="text-purple-400 text-sm">Start with the problem, recurse, cache results</p></div>
                            </div>
                            <div className="space-y-3">
                                {[
                                    { label: "How it works", text: "Start with the original problem and recursively break it down, storing results to avoid recomputation." },
                                    { label: "Best for", text: "Natural recursive problems, when not all subproblems are needed, tree-like recursion patterns." },
                                    { label: "Examples", text: "Fibonacci, Tree DP, some optimization problems." },
                                ].map(item => (
                                    <div key={item.label} className="bg-slate-800/60 p-4 rounded-lg border border-purple-500/20">
                                        <h4 className="font-semibold text-purple-300 mb-1 text-sm">{item.label}</h4>
                                        <p className="text-slate-400 text-sm">{item.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-rose-500/10 rounded-xl p-8 border border-rose-500/20">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 bg-rose-600 rounded-lg flex items-center justify-center"><Target className="h-6 w-6 text-white" /></div>
                                <div><h3 className="text-xl font-bold text-rose-300">Bottom-up — Tabulation</h3><p className="text-rose-400 text-sm">Start from base cases, fill a table iteratively</p></div>
                            </div>
                            <div className="space-y-3">
                                {[
                                    { label: "How it works", text: "Start with base cases and iteratively build up solutions to larger problems using a table." },
                                    { label: "Best for", text: "When all subproblems are needed, better space optimization, iterative problem patterns." },
                                    { label: "Examples", text: "Coin Change, LCS, Knapsack, Edit Distance." },
                                ].map(item => (
                                    <div key={item.label} className="bg-slate-800/60 p-4 rounded-lg border border-rose-500/20">
                                        <h4 className="font-semibold text-rose-300 mb-1 text-sm">{item.label}</h4>
                                        <p className="text-slate-400 text-sm">{item.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
