import React from 'react';
export const metadata = {
    title: "Recursion Algorithms – Interactive Visualizer",
    description: "Visualize recursive algorithms including Factorial, Fibonacci Sequence, Tower of Hanoi, N-Queens, Maze Solver, and String Reversal. Understand call stacks and base cases step by step.",
    keywords: ["recursion", "recursive algorithms", "tower of hanoi", "n-queens", "fibonacci", "maze solver", "algorithm visualization"],
    openGraph: {
        title: "Recursion Algorithms Visualizer – DSAverse",
        description: "Interactive step-by-step recursion visualizations with call stack animations.",
        images: [{ url: "/og-image.png" }],
    },
};

import Link from 'next/link';
import { ArrowRight, Clock, Code, Play, Layers, Brain, BookOpen, GitBranch, RotateCcw, FlaskConical, Sigma, Grid3X3, Map, Type } from 'lucide-react';

const RecursionPage = () => {
    const recursionAlgorithms = [
        {
            name: "Factorial",
            slug: "factorial",
            description: "Calculate factorial using recursive function calls to understand base cases and the call stack building up and unwinding.",
            timeComplexity: "O(n)",
            spaceComplexity: "O(n)",
            difficulty: "Beginner",
            concept: "Base Case & Recursive Call",
            realWorldUse: "Permutations, combinatorics, probability",
            Icon: Sigma
        },
        {
            name: "String Reversal",
            slug: "string-reversal",
            description: "Reverse a string character by character using recursive divide & conquer — watch the result build on the unwind phase.",
            timeComplexity: "O(n)",
            spaceComplexity: "O(n)",
            difficulty: "Beginner",
            concept: "Divide & Conquer",
            realWorldUse: "Text processing, palindrome checking",
            Icon: Type
        },
        {
            name: "Fibonacci Sequence",
            slug: "fibonacci-sequence",
            description: "Compute Fibonacci numbers showing explosive naive recursion vs efficient memoization — see the dramatic call count difference.",
            timeComplexity: "O(2^n) / O(n)",
            spaceComplexity: "O(n)",
            difficulty: "Beginner",
            concept: "Memoization & Optimization",
            realWorldUse: "Dynamic programming, nature patterns",
            Icon: GitBranch
        },
        {
            name: "Tower of Hanoi",
            slug: "tower-of-hanoi",
            description: "Solve the classic puzzle using elegant divide & conquer — three recursive steps that together achieve what seems impossible.",
            timeComplexity: "O(2^n)",
            spaceComplexity: "O(n)",
            difficulty: "Intermediate",
            concept: "Divide & Conquer",
            realWorldUse: "Backup rotation, recursive decomposition",
            Icon: Layers
        },
        {
            name: "N-Queens Problem",
            slug: "n-queens",
            description: "Place N queens on an NxN chessboard using backtracking — explore and undo choices systematically until solutions are found.",
            timeComplexity: "O(N!)",
            spaceComplexity: "O(N²)",
            difficulty: "Advanced",
            concept: "Backtracking",
            realWorldUse: "Constraint satisfaction, game AI",
            Icon: Grid3X3
        },
        {
            name: "Maze Solver",
            slug: "maze-solver",
            description: "Navigate a maze using backtracking — explore paths, hit dead ends, retreat, and try again until the goal is found.",
            timeComplexity: "O(4^(m×n))",
            spaceComplexity: "O(m×n)",
            difficulty: "Advanced",
            concept: "Backtracking & Path Finding",
            realWorldUse: "Robotics navigation, GPS routing",
            Icon: Map
        }
    ];

    const getDifficultyStyle = (difficulty) => {
        switch (difficulty) {
            case 'Beginner': return 'bg-green-500/15 text-green-400 border border-green-500/30';
            case 'Intermediate': return 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30';
            case 'Advanced': return 'bg-red-500/15 text-red-400 border border-red-500/30';
            default: return 'bg-slate-700 text-slate-300';
        }
    };

    const conceptCards = [
        {
            Icon: Code,
            title: "Base Case",
            desc: "The terminating condition that stops the recursion. Every recursive function must have at least one base case, otherwise it runs forever.",
            color: "text-green-400",
            bg: "bg-green-500/10 border-green-500/20"
        },
        {
            Icon: RotateCcw,
            title: "Recursive Call",
            desc: "The function calls itself with modified parameters, reducing the problem toward the base case. Each call is a smaller version of the same problem.",
            color: "text-blue-400",
            bg: "bg-blue-500/10 border-blue-500/20"
        },
        {
            Icon: Layers,
            title: "Call Stack",
            desc: "Each recursive call is pushed onto the call stack and resolved in reverse order (LIFO). The stack unwinds as base cases return their values.",
            color: "text-purple-400",
            bg: "bg-purple-500/10 border-purple-500/20"
        }
    ];

    return (
        <div className="min-h-screen bg-slate-950">
            {/* Header */}
            <div className="bg-gradient-to-br from-green-600 via-emerald-600 to-teal-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="text-center">
                        <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm mb-6">
                            <BookOpen className="h-4 w-4" /> Recursive Thinking
                        </div>
                        <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">
                            Recursion Algorithms
                        </h1>
                        <p className="text-xl text-green-100 mb-8 max-w-3xl mx-auto leading-relaxed">
                            Master the art of recursive thinking through interactive visualizations.
                            Watch how functions call themselves, build call stacks, and solve complex problems elegantly.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="flex items-center gap-2 bg-white/15 border border-white/20 px-4 py-2 rounded-full">
                                <Play className="h-4 w-4" /> Step-by-step animations
                            </div>
                            <div className="flex items-center gap-2 bg-white/15 border border-white/20 px-4 py-2 rounded-full">
                                <Layers className="h-4 w-4" /> Call stack visualization
                            </div>
                            <div className="flex items-center gap-2 bg-white/15 border border-white/20 px-4 py-2 rounded-full">
                                <Brain className="h-4 w-4" /> Active recall quizzes
                            </div>
                            <div className="flex items-center gap-2 bg-white/15 border border-white/20 px-4 py-2 rounded-full">
                                <Clock className="h-4 w-4" /> Complexity analysis
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Key Concepts */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-bold text-white mb-3">Understanding Recursion</h2>
                    <p className="text-slate-400 max-w-2xl mx-auto">
                        A function that calls itself to solve smaller instances of the same problem — three core ideas make it work.
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                    {conceptCards.map(({ Icon, title, desc, color, bg }) => (
                        <div key={title} className={`bg-slate-900/70 rounded-2xl p-6 border-2 ${bg} shadow-xl`}>
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${bg}`}>
                                <Icon className={`h-6 w-6 ${color}`} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Algorithms Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-bold text-white mb-3">Explore Recursive Algorithms</h2>
                    <p className="text-slate-400">Start simple, progress to complex — each visualizer includes step navigation and active recall quizzes.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                    {recursionAlgorithms.map((algorithm) => (
                        <Link key={algorithm.slug} href={`/recursion/${algorithm.slug}`} className="group block h-full">
                            <div className="bg-slate-900/70 rounded-2xl border border-slate-700/50 hover:border-green-500/50 shadow-xl transition-all duration-300 overflow-hidden hover:-translate-y-1 hover:shadow-green-500/10 h-full flex flex-col">
                                {/* Card header */}
                                <div className="bg-gradient-to-br from-green-600 to-emerald-700 p-6 text-white flex-shrink-0">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="bg-white/20 rounded-xl p-2.5">
                                            <algorithm.Icon className="h-6 w-6 text-white" />
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getDifficultyStyle(algorithm.difficulty)}`}>
                                            {algorithm.difficulty}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold mb-1.5">{algorithm.name}</h3>
                                    <p className="text-white/75 text-sm leading-relaxed">{algorithm.description}</p>
                                </div>

                                {/* Card body */}
                                <div className="p-5 flex flex-col flex-1">
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <div className="bg-slate-800/60 rounded-lg text-center py-2.5">
                                            <div className="text-sm font-bold text-green-400 font-mono">{algorithm.timeComplexity}</div>
                                            <div className="text-xs text-slate-500 mt-0.5">Time</div>
                                        </div>
                                        <div className="bg-slate-800/60 rounded-lg text-center py-2.5">
                                            <div className="text-sm font-bold text-emerald-400 font-mono">{algorithm.spaceComplexity}</div>
                                            <div className="text-xs text-slate-500 mt-0.5">Space</div>
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
                                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Concept: </span>
                                            <span className="text-xs text-green-400 font-medium">{algorithm.concept}</span>
                                        </div>
                                    </div>

                                    <div className="flex-1 mb-4">
                                        <div className="text-xs text-slate-500 leading-relaxed">
                                            <span className="font-semibold text-slate-400">Used in: </span>
                                            {algorithm.realWorldUse}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-3 border-t border-slate-800 mt-auto">
                                        <span className="text-sm font-medium text-green-400 group-hover:text-green-300 transition-colors flex items-center gap-1">
                                            Explore <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <Brain className="h-3.5 w-3.5 text-slate-600" />
                                            <span className="text-xs text-slate-600">Quiz included</span>
                                        </div>
                                    </div>
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
