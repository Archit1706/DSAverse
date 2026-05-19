import React from 'react';

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
import Link from 'next/link';
import { ArrowRight, Clock, Code, Play, Brain, Zap, Target } from 'lucide-react';

const DynamicProgrammingPage = () => {
    const dpAlgorithms = [
        {
            name: "Fibonacci Numbers",
            slug: "fibonacci-numbers",
            description: "Classic example of memoization transforming exponential to linear time complexity",
            timeComplexity: "O(n)",
            spaceComplexity: "O(n)",
            difficulty: "Beginner",
            type: "Top-down DP",
            pattern: "Memoization"
        },
        {
            name: "Making Change",
            slug: "making-change",
            description: "Find minimum coins needed to make change using bottom-up dynamic programming",
            timeComplexity: "O(amount × coins)",
            spaceComplexity: "O(amount)",
            difficulty: "Intermediate",
            type: "Bottom-up DP",
            pattern: "Unbounded Knapsack"
        },
        {
            name: "Longest Common Subsequence",
            slug: "largest-common-subsequence",
            description: "2D DP table approach to find longest common subsequence between two strings",
            timeComplexity: "O(m × n)",
            spaceComplexity: "O(m × n)",
            difficulty: "Intermediate",
            type: "2D DP Table",
            pattern: "String Matching"
        },
        {
            name: "0/1 Knapsack",
            slug: "knapsack",
            description: "Classic optimization problem using 2D DP to maximize value within weight constraint",
            timeComplexity: "O(n × W)",
            spaceComplexity: "O(n × W)",
            difficulty: "Intermediate",
            type: "2D DP Table",
            pattern: "Optimization"
        },
        {
            name: "Longest Increasing Subsequence",
            slug: "longest-increasing-subsequence",
            description: "Find the length of longest strictly increasing subsequence in an array",
            timeComplexity: "O(n²) / O(n log n)",
            spaceComplexity: "O(n)",
            difficulty: "Intermediate",
            type: "1D DP Array",
            pattern: "Subsequence",
            comingSoon: true
        },
        {
            name: "Edit Distance",
            slug: "edit-distance",
            description: "Minimum operations to transform one string to another using insertions, deletions, substitutions",
            timeComplexity: "O(m × n)",
            spaceComplexity: "O(m × n)",
            difficulty: "Advanced",
            type: "2D DP Table",
            pattern: "String Transformation",
            comingSoon: true
        },
        {
            name: "Maximum Subarray",
            slug: "maximum-subarray",
            description: "Kadane's algorithm to find contiguous subarray with maximum sum",
            timeComplexity: "O(n)",
            spaceComplexity: "O(1)",
            difficulty: "Beginner",
            type: "Optimized DP",
            pattern: "Subarray",
            comingSoon: true
        },
        {
            name: "House Robber",
            slug: "house-robber",
            description: "Maximum money that can be robbed without robbing adjacent houses",
            timeComplexity: "O(n)",
            spaceComplexity: "O(1)",
            difficulty: "Beginner",
            type: "1D DP Array",
            pattern: "Decision Making"
        }
    ];

    const getDifficultyColor = (difficulty) => {
        switch (difficulty) {
            case 'Beginner': return 'bg-green-500/15 text-green-400';
            case 'Intermediate': return 'bg-yellow-500/15 text-yellow-400';
            case 'Advanced': return 'bg-red-500/15 text-red-400';
            default: return 'bg-slate-700 text-slate-300';
        }
    };

    const getPatternColor = (pattern) => {
        const colors = {
            'Memoization': 'bg-purple-500/15 text-purple-400',
            'Unbounded Knapsack': 'bg-blue-500/15 text-blue-400',
            'String Matching': 'bg-rose-500/15 text-rose-400',
            'Optimization': 'bg-orange-500/15 text-orange-400',
            'Subsequence': 'bg-blue-500/15 text-blue-400',
            'String Transformation': 'bg-purple-500/15 text-purple-400',
            'Subarray': 'bg-blue-500/15 text-blue-400',
            'Decision Making': 'bg-green-500/15 text-green-400'
        };
        return colors[pattern] || 'bg-slate-700 text-slate-300';
    };

    return (
        <div className="min-h-screen bg-slate-950">
            {/* Header */}
            <div className="bg-gradient-to-r from-rose-500 to-pink-500 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="text-center">
                        <h1 className="text-4xl md:text-6xl font-bold mb-6 flex items-center justify-center gap-4">
                            <Brain className="h-16 w-16" />
                            Dynamic Programming
                        </h1>
                        <p className="text-xl text-rose-100 mb-8 max-w-3xl mx-auto">
                            Master the art of solving complex problems by breaking them down into simpler subproblems.
                            Watch how memoization and tabulation optimize recursive solutions.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                                <Play className="h-4 w-4" />
                                Interactive Visualizations
                            </div>
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                                <Target className="h-4 w-4" />
                                State Transitions
                            </div>
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                                <Zap className="h-4 w-4" />
                                Optimization Techniques
                            </div>
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                                <Code className="h-4 w-4" />
                                Multiple Approaches
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* DP Concepts Overview */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                    <div className="bg-slate-900/70 rounded-xl shadow-lg p-6 border-2 border-slate-700/50">
                        <div className="w-16 h-16 bg-rose-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Brain className="h-8 w-8 text-rose-600" />
                        </div>
                        <h3 className="text-xl font-semibold mb-3 text-white text-center">Optimal Substructure</h3>
                        <p className="text-slate-400 text-center">
                            Solutions to larger problems depend on solutions to smaller subproblems
                        </p>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl shadow-lg p-6 border-2 border-slate-700/50">
                        <div className="w-16 h-16 bg-rose-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Target className="h-8 w-8 text-rose-600" />
                        </div>
                        <h3 className="text-xl font-semibold mb-3 text-white text-center">Overlapping Subproblems</h3>
                        <p className="text-slate-400 text-center">
                            Same subproblems are solved multiple times, making memoization valuable
                        </p>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl shadow-lg p-6 border-2 border-slate-700/50">
                        <div className="w-16 h-16 bg-rose-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Zap className="h-8 w-8 text-rose-600" />
                        </div>
                        <h3 className="text-xl font-semibold mb-3 text-white text-center">Memoization</h3>
                        <p className="text-slate-400 text-center">
                            Store computed results to avoid redundant calculations and improve efficiency
                        </p>
                    </div>
                </div>
            </div>

            {/* Algorithms Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-white mb-4">
                        Interactive DP Visualizations
                    </h2>
                    <p className="text-xl text-slate-400">
                        Explore classic dynamic programming problems with step-by-step visualizations
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {dpAlgorithms.map((algorithm, index) => (
                        <div key={index} className="group relative">
                            {algorithm.comingSoon ? (
                                <div className="bg-slate-900/70 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-slate-700/50 opacity-75 overflow-hidden">
                                    <div className="absolute top-4 right-4 bg-gray-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                                        Coming Soon
                                    </div>
                                    <div className="p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-xl font-bold text-slate-400">{algorithm.name}</h3>
                                        </div>

                                        <p className="text-slate-500 mb-4 text-sm leading-relaxed">
                                            {algorithm.description}
                                        </p>

                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium text-slate-400">Time Complexity:</span>
                                                <code className="bg-slate-800/60 text-slate-400 px-2 py-1 rounded text-sm">
                                                    {algorithm.timeComplexity}
                                                </code>
                                            </div>

                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium text-slate-400">Space Complexity:</span>
                                                <code className="bg-slate-800/60 text-slate-400 px-2 py-1 rounded text-sm">
                                                    {algorithm.spaceComplexity}
                                                </code>
                                            </div>

                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium text-slate-400">Difficulty:</span>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium opacity-75 ${getDifficultyColor(algorithm.difficulty)}`}>
                                                    {algorithm.difficulty}
                                                </span>
                                            </div>

                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium text-slate-400">Pattern:</span>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium opacity-75 ${getPatternColor(algorithm.pattern)}`}>
                                                    {algorithm.pattern}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="mt-6">
                                            <button className="w-full bg-gray-400 text-white px-4 py-2 rounded-lg font-medium cursor-not-allowed">
                                                Coming Soon
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <Link href={`/dynamic-programming/${algorithm.slug}`}>
                                    <div className="bg-slate-900/70 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:transform hover:scale-105 border-2 border-slate-700/50 hover:border-rose-500/50 overflow-hidden">
                                        <div className="p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-xl font-bold text-white">{algorithm.name}</h3>
                                                <ArrowRight className="h-5 w-5 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>

                                            <p className="text-slate-400 mb-4 text-sm leading-relaxed">
                                                {algorithm.description}
                                            </p>

                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm font-medium text-slate-300">Time Complexity:</span>
                                                    <code className="bg-rose-500/15 text-rose-400 px-2 py-1 rounded text-sm">
                                                        {algorithm.timeComplexity}
                                                    </code>
                                                </div>

                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm font-medium text-slate-300">Space Complexity:</span>
                                                    <code className="bg-rose-500/15 text-rose-400 px-2 py-1 rounded text-sm">
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
                                                    <span className="text-sm font-medium text-slate-300">Type:</span>
                                                    <span className="bg-blue-500/15 text-blue-400 px-2 py-1 rounded-full text-xs font-medium">
                                                        {algorithm.type}
                                                    </span>
                                                </div>

                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm font-medium text-slate-300">Pattern:</span>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPatternColor(algorithm.pattern)}`}>
                                                        {algorithm.pattern}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="mt-6">
                                                <button className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white px-4 py-2 rounded-lg font-medium hover:from-rose-600 hover:to-pink-600 transition-all duration-200 flex items-center justify-center gap-2">
                                                    <Play className="h-4 w-4" />
                                                    Start Visualization
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* DP Approaches Section */}
            <div className="bg-slate-900/70 border-t-2 border-slate-700/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-white mb-4">
                            Dynamic Programming Approaches
                        </h2>
                        <p className="text-xl text-slate-400 max-w-3xl mx-auto">
                            Learn the two main paradigms of dynamic programming and when to use each approach
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        {/* Top-down (Memoization) */}
                        <div className="bg-purple-500/10 rounded-xl p-8 border-2 border-purple-500/20">
                            <div className="flex items-center mb-6">
                                <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mr-4">
                                    <Brain className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-purple-300">Top-down Approach</h3>
                                    <p className="text-purple-300">Memoization</p>
                                </div>
                            </div>

                            <div className="space-y-4 mb-6">
                                <div className="bg-slate-800/60 p-4 rounded-lg border border-purple-500/20">
                                    <h4 className="font-semibold text-purple-300 mb-2">How it works:</h4>
                                    <p className="text-purple-300 text-sm">Start with the original problem and recursively break it down, storing results to avoid recomputation.</p>
                                </div>

                                <div className="bg-slate-800/60 p-4 rounded-lg border border-purple-500/20">
                                    <h4 className="font-semibold text-purple-300 mb-2">Best for:</h4>
                                    <ul className="text-purple-300 text-sm space-y-1">
                                        <li>• Natural recursive problems</li>
                                        <li>• When you don't need all subproblems</li>
                                        <li>• Tree-like recursion patterns</li>
                                    </ul>
                                </div>

                                <div className="bg-slate-800/60 p-4 rounded-lg border border-purple-500/20">
                                    <h4 className="font-semibold text-purple-300 mb-2">Examples:</h4>
                                    <p className="text-purple-300 text-sm">Fibonacci, Tree DP, Some optimization problems</p>
                                </div>
                            </div>
                        </div>

                        {/* Bottom-up (Tabulation) */}
                        <div className="bg-rose-500/10 rounded-xl p-8 border-2 border-rose-500/20">
                            <div className="flex items-center mb-6">
                                <div className="w-12 h-12 bg-rose-500 rounded-lg flex items-center justify-center mr-4">
                                    <Target className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-rose-300">Bottom-up Approach</h3>
                                    <p className="text-rose-300">Tabulation</p>
                                </div>
                            </div>

                            <div className="space-y-4 mb-6">
                                <div className="bg-slate-800/60 p-4 rounded-lg border border-rose-500/20">
                                    <h4 className="font-semibold text-rose-300 mb-2">How it works:</h4>
                                    <p className="text-rose-300 text-sm">Start with base cases and iteratively build up solutions to larger problems using a table.</p>
                                </div>

                                <div className="bg-slate-800/60 p-4 rounded-lg border border-rose-500/20">
                                    <h4 className="font-semibold text-rose-300 mb-2">Best for:</h4>
                                    <ul className="text-rose-300 text-sm space-y-1">
                                        <li>• When you need all subproblems</li>
                                        <li>• Better space optimization</li>
                                        <li>• Iterative problem patterns</li>
                                    </ul>
                                </div>

                                <div className="bg-slate-800/60 p-4 rounded-lg border border-rose-500/20">
                                    <h4 className="font-semibold text-rose-300 mb-2">Examples:</h4>
                                    <p className="text-rose-300 text-sm">Coin Change, LCS, Knapsack, Edit Distance</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Why Learn DP Section */}
            <div className="bg-slate-950">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-white mb-4">
                            Why Learn Dynamic Programming?
                        </h2>
                        <p className="text-xl text-slate-400 max-w-3xl mx-auto">
                            Dynamic programming is essential for solving optimization problems efficiently
                            and is frequently tested in technical interviews.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="text-center p-6">
                            <div className="w-16 h-16 bg-rose-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Zap className="h-8 w-8 text-rose-600" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2 text-white">Optimization</h3>
                            <p className="text-slate-400">
                                Transform exponential algorithms into polynomial time solutions through intelligent caching
                            </p>
                        </div>

                        <div className="text-center p-6">
                            <div className="w-16 h-16 bg-rose-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Brain className="h-8 w-8 text-rose-600" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2 text-white">Problem Solving</h3>
                            <p className="text-slate-400">
                                Develop systematic thinking for breaking complex problems into manageable subproblems
                            </p>
                        </div>

                        <div className="text-center p-6">
                            <div className="w-16 h-16 bg-rose-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Target className="h-8 w-8 text-rose-600" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2 text-white">Interview Success</h3>
                            <p className="text-slate-400">
                                Master one of the most important topics in technical interviews at top companies
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DynamicProgrammingPage;