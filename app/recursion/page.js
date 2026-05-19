import React from 'react';

export const metadata = {
    title: "Recursion Algorithms – Interactive Visualizer",
    description:
        "Visualize recursive algorithms including Factorial, Fibonacci Sequence, Tower of Hanoi, N-Queens, Maze Solver, and String Reversal. Understand call stacks and base cases step by step.",
    keywords: ["recursion", "recursive algorithms", "tower of hanoi", "n-queens", "fibonacci", "maze solver", "algorithm visualization"],
    openGraph: {
        title: "Recursion Algorithms Visualizer – DSAverse",
        description: "Interactive step-by-step recursion visualizations with call stack animations.",
        images: [{ url: "/og-image.png" }],
    },
};
import Link from 'next/link';
import { ArrowRight, Clock, Code, Play, Layers } from 'lucide-react';

const RecursionPage = () => {
    const recursionAlgorithms = [
        {
            name: "Factorial",
            slug: "factorial",
            description: "Calculate factorial using recursive function calls to understand base cases and recursive patterns",
            timeComplexity: "O(n)",
            spaceComplexity: "O(n)",
            difficulty: "Beginner",
            concept: "Base Case & Recursive Call",
            realWorldUse: "Mathematical calculations, permutations, combinatorics"
        },
        {
            name: "String Reversal",
            slug: "string-reversal",
            description: "Reverse a string character by character using recursive approach",
            timeComplexity: "O(n)",
            spaceComplexity: "O(n)",
            difficulty: "Beginner",
            concept: "Divide & Conquer",
            realWorldUse: "Text processing, palindrome checking, data transformation"
        },
        {
            name: "Fibonacci Sequence",
            slug: "fibonacci",
            description: "Compute Fibonacci numbers showing explosive naive recursion vs efficient memoization",
            timeComplexity: "O(2^n) / O(n)",
            spaceComplexity: "O(n)",
            difficulty: "Beginner",
            concept: "Memoization & Optimization",
            realWorldUse: "Dynamic programming, nature patterns, mathematical sequences, algorithm optimization"
        },
        {
            name: "Tower of Hanoi",
            slug: "tower-of-hanoi",
            description: "Solve the classic puzzle using elegant divide & conquer recursive strategy",
            timeComplexity: "O(2^n)",
            spaceComplexity: "O(n)",
            difficulty: "Intermediate",
            concept: "Divide & Conquer",
            realWorldUse: "Backup rotation systems, puzzle algorithms, recursive problem decomposition"
        },
        {
            name: "N-Queens Problem",
            slug: "n-queens",
            description: "Place N queens on NxN chessboard using backtracking recursion",
            timeComplexity: "O(N!)",
            spaceComplexity: "O(N²)",
            difficulty: "Advanced",
            concept: "Backtracking",
            realWorldUse: "Constraint satisfaction, game AI, optimization problems"
        },
        {
            name: "Maze Solver",
            slug: "maze-solver",
            description: "Navigate through maze using backtracking to explore paths and handle dead ends",
            timeComplexity: "O(4^(m×n))",
            spaceComplexity: "O(m×n)",
            difficulty: "Advanced",
            concept: "Backtracking & Path Finding",
            realWorldUse: "Robotics navigation, GPS routing, game AI pathfinding, network routing"
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

    return (
        <div className="min-h-screen bg-slate-950">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="text-center">
                        <h1 className="text-4xl md:text-6xl font-bold mb-6">
                            Recursion Algorithms
                        </h1>
                        <p className="text-xl text-green-100 mb-8 max-w-3xl mx-auto">
                            Master the art of recursive thinking through interactive visualizations.
                            Watch how functions call themselves to solve complex problems elegantly.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                                <Play className="h-4 w-4" />
                                Interactive Visualizations
                            </div>
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                                <Code className="h-4 w-4" />
                                Step-by-step Explanations
                            </div>
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                                <Layers className="h-4 w-4" />
                                Call Stack Visualization
                            </div>
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                                <Clock className="h-4 w-4" />
                                Complexity Analysis
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Key Concepts Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-white mb-4">
                        Understanding Recursion
                    </h2>
                    <p className="text-xl text-slate-400 max-w-3xl mx-auto">
                        Recursion is a programming technique where a function calls itself to solve smaller instances of the same problem.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                    <div className="bg-slate-900/70 rounded-xl p-6 border border-slate-700/50 shadow-xl border-2">
                        <div className="w-12 h-12 bg-green-500/15 rounded-lg flex items-center justify-center mb-4">
                            <Code className="h-6 w-6 text-green-600" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Base Case</h3>
                        <p className="text-slate-400">
                            The terminating condition that stops the recursion. Every recursive function must have at least one base case.
                        </p>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl p-6 border border-slate-700/50 shadow-xl border-2">
                        <div className="w-12 h-12 bg-green-500/15 rounded-lg flex items-center justify-center mb-4">
                            <Layers className="h-6 w-6 text-green-600" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Recursive Call</h3>
                        <p className="text-slate-400">
                            The function calls itself with modified parameters, working towards the base case.
                        </p>
                    </div>

                    <div className="bg-slate-900/70 rounded-xl p-6 border border-slate-700/50 shadow-xl border-2">
                        <div className="w-12 h-12 bg-green-500/15 rounded-lg flex items-center justify-center mb-4">
                            <Clock className="h-6 w-6 text-green-600" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Call Stack</h3>
                        <p className="text-slate-400">
                            Each recursive call is added to the call stack and resolved in reverse order (LIFO - Last In, First Out).
                        </p>
                    </div>
                </div>
            </div>

            {/* Algorithms Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-white mb-4">
                        Explore Recursive Algorithms
                    </h2>
                    <p className="text-xl text-slate-400">
                        Start with simple examples and progress to complex problem-solving patterns
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {recursionAlgorithms.map((algorithm, index) => (
                        <Link key={index} href={`/recursion/${algorithm.slug}`}>
                            <div className="group bg-slate-900/70 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:transform hover:scale-105 border-2 border-slate-700/50 hover:border-green-500/50 overflow-hidden">
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-xl font-bold text-white">{algorithm.name}</h3>
                                        <ArrowRight className="h-5 w-5 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>

                                    <p className="text-slate-400 mb-4 text-sm leading-relaxed">
                                        {algorithm.description}
                                    </p>

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium text-slate-300">Time Complexity:</span>
                                            <code className="bg-green-500/15 text-green-400 px-2 py-1 rounded text-sm">
                                                {algorithm.timeComplexity}
                                            </code>
                                        </div>

                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium text-slate-300">Space Complexity:</span>
                                            <code className="bg-green-500/15 text-green-400 px-2 py-1 rounded text-sm">
                                                {algorithm.spaceComplexity}
                                            </code>
                                        </div>

                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium text-slate-300">Concept:</span>
                                            <span className="text-sm font-medium text-green-400">
                                                {algorithm.concept}
                                            </span>
                                        </div>

                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium text-slate-300">Difficulty:</span>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(algorithm.difficulty)}`}>
                                                {algorithm.difficulty}
                                            </span>
                                        </div>
                                    </div>

                                    {algorithm.realWorldUse && (
                                        <div className="mt-4 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                                            <p className="text-xs text-green-300">
                                                <span className="font-semibold">Real-world use:</span> {algorithm.realWorldUse}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default RecursionPage;