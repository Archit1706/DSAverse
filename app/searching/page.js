import React from 'react';

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
import Link from 'next/link';
import { ArrowRight, Clock, Code, Play, Search, Target, Zap, TrendingUp } from 'lucide-react';

const SearchingPage = () => {
    const searchingAlgorithms = [
        {
            name: "Linear Search",
            slug: "linear-search",
            description: "Sequential search through each element until target is found",
            timeComplexity: "O(n)",
            spaceComplexity: "O(1)",
            difficulty: "Beginner",
            requirement: "None",
            icon: <Search className="h-6 w-6" />
        },
        {
            name: "Binary Search",
            slug: "binary-search",
            description: "Divide and conquer search that halves the search space each time",
            timeComplexity: "O(log n)",
            spaceComplexity: "O(1)",
            difficulty: "Beginner",
            requirement: "Sorted Array",
            icon: <Target className="h-6 w-6" />
        },
        {
            name: "Jump Search",
            slug: "jump-search",
            description: "Block-based search that jumps ahead by fixed steps",
            timeComplexity: "O(√n)",
            spaceComplexity: "O(1)",
            difficulty: "Intermediate",
            requirement: "Sorted Array",
            icon: <Zap className="h-6 w-6" />
        },
        {
            name: "Interpolation Search",
            slug: "interpolation-search",
            description: "Estimates position based on value distribution in uniformly distributed data",
            timeComplexity: "O(log log n)",
            spaceComplexity: "O(1)",
            difficulty: "Intermediate",
            requirement: "Sorted & Uniform",
            icon: <TrendingUp className="h-6 w-6" />
        },
        {
            name: "Exponential Search",
            slug: "exponential-search",
            description: "Finds range by exponential jumps, then performs binary search",
            timeComplexity: "O(log n)",
            spaceComplexity: "O(1)",
            difficulty: "Intermediate",
            requirement: "Sorted Array",
            icon: <TrendingUp className="h-6 w-6" />
        },
        {
            name: "Fibonacci Search",
            slug: "fibonacci-search",
            description: "Uses Fibonacci numbers to divide array into optimal sections",
            timeComplexity: "O(log n)",
            spaceComplexity: "O(1)",
            difficulty: "Advanced",
            requirement: "Sorted Array",
            icon: <Target className="h-6 w-6" />
        },
        {
            name: "Ternary Search",
            slug: "ternary-search",
            description: "Divides array into three parts, eliminating 2/3 of search space",
            timeComplexity: "O(log₃ n)",
            spaceComplexity: "O(1)",
            difficulty: "Advanced",
            requirement: "Sorted Array",
            icon: <Search className="h-6 w-6" />
        },
        {
            name: "Block Search",
            slug: "block-search",
            description: "Divides array into blocks and searches sequentially within blocks",
            timeComplexity: "O(√n)",
            spaceComplexity: "O(1)",
            difficulty: "Intermediate",
            requirement: "Sorted Array",
            icon: <Zap className="h-6 w-6" />
        }
    ];

    const getDifficultyColor = (difficulty) => {
        switch (difficulty) {
            case 'Beginner': return 'bg-green-500/15 text-green-400 border-green-500/20';
            case 'Intermediate': return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20';
            case 'Advanced': return 'bg-red-500/15 text-red-400 border-red-500/20';
            default: return 'bg-slate-700/60 text-slate-400 border-slate-600';
        }
    };

    return (
        <div className="min-h-screen bg-slate-950">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-rose-500 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="text-center">
                        <div className="flex justify-center mb-6">
                            <div className="bg-white/20 rounded-full p-4">
                                <Search className="h-12 w-12 text-white" />
                            </div>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-bold mb-6">
                            Search Algorithms
                        </h1>
                        <p className="text-xl md:text-2xl text-red-100 mb-8 max-w-4xl mx-auto">
                            Master the art of finding elements efficiently. From simple linear searches to advanced logarithmic algorithms.
                        </p>
                        <div className="flex flex-wrap justify-center gap-6 text-lg">
                            <div className="flex items-center bg-white/20 px-4 py-2 rounded-full">
                                <Clock className="h-5 w-5 mr-2" />
                                <span>8 Algorithms</span>
                            </div>
                            <div className="flex items-center bg-white/20 px-4 py-2 rounded-full">
                                <Target className="h-5 w-5 mr-2" />
                                <span>Interactive Visualizations</span>
                            </div>
                            <div className="flex items-center bg-white/20 px-4 py-2 rounded-full">
                                <Code className="h-5 w-5 mr-2" />
                                <span>Step-by-step Explanations</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Introduction */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="bg-slate-900/70 rounded-2xl border border-slate-700/50 shadow-xl p-8 mb-12">
                    <h2 className="text-3xl font-bold text-white mb-6 text-center">
                        Why Learn Search Algorithms?
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="text-center">
                            <div className="bg-red-500/15 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                                <Search className="h-8 w-8 text-red-600" />
                            </div>
                            <h3 className="text-xl font-semibold mb-3 text-slate-100">Fundamental Skill</h3>
                            <p className="text-slate-400">
                                Searching is one of the most common operations in programming. Understanding different approaches helps you choose the right tool for each situation.
                            </p>
                        </div>
                        <div className="text-center">
                            <div className="bg-red-500/15 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                                <Zap className="h-8 w-8 text-red-600" />
                            </div>
                            <h3 className="text-xl font-semibold mb-3 text-slate-100">Performance Optimization</h3>
                            <p className="text-slate-400">
                                From O(n) to O(log n) - learn how algorithm choice dramatically impacts performance, especially with large datasets.
                            </p>
                        </div>
                        <div className="text-center">
                            <div className="bg-red-500/15 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                                <Target className="h-8 w-8 text-red-600" />
                            </div>
                            <h3 className="text-xl font-semibold mb-3 text-slate-100">Real-world Applications</h3>
                            <p className="text-slate-400">
                                From database queries to web search engines, these algorithms power the technology we use every day.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Algorithm Categories */}
                <div className="mb-12">
                    <h2 className="text-3xl font-bold text-white mb-8 text-center">
                        Algorithm Categories
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6 border-l-4 border-green-500">
                            <h3 className="text-xl font-bold text-green-700 mb-3">Basic Algorithms</h3>
                            <p className="text-slate-400 mb-4">
                                Simple, intuitive approaches that work on any data structure.
                            </p>
                            <ul className="text-sm text-slate-300 space-y-1">
                                <li>• Linear Search</li>
                                <li>• No prerequisites</li>
                                <li>• Easy to understand</li>
                            </ul>
                        </div>
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6 border-l-4 border-yellow-500">
                            <h3 className="text-xl font-bold text-yellow-700 mb-3">Sorted Array Algorithms</h3>
                            <p className="text-slate-400 mb-4">
                                Efficient algorithms that require sorted input data.
                            </p>
                            <ul className="text-sm text-slate-300 space-y-1">
                                <li>• Binary, Jump, Exponential</li>
                                <li>• Logarithmic time complexity</li>
                                <li>• Divide and conquer</li>
                            </ul>
                        </div>
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 shadow-xl p-6 border-l-4 border-red-500">
                            <h3 className="text-xl font-bold text-red-700 mb-3">Specialized Algorithms</h3>
                            <p className="text-slate-400 mb-4">
                                Advanced techniques for specific data distributions.
                            </p>
                            <ul className="text-sm text-slate-300 space-y-1">
                                <li>• Fibonacci, Ternary</li>
                                <li>• Interpolation Search</li>
                                <li>• Mathematical optimizations</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Algorithms Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {searchingAlgorithms.map((algorithm, index) => (
                        <Link
                            key={index}
                            href={`/searching/${algorithm.slug}`}
                            className="group bg-slate-900/70 rounded-xl border border-slate-700/50 hover:border-red-500/50 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
                        >
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center">
                                        <div className="bg-red-500/15 rounded-lg p-3 mr-4 group-hover:bg-red-500/25 transition-colors">
                                            <div className="text-red-600">
                                                {algorithm.icon}
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-white group-hover:text-red-600 transition-colors">
                                                {algorithm.name}
                                            </h3>
                                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(algorithm.difficulty)}`}>
                                                {algorithm.difficulty}
                                            </span>
                                        </div>
                                    </div>
                                    <ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-red-500 transform group-hover:translate-x-1 transition-all" />
                                </div>

                                <p className="text-slate-400 mb-4 line-clamp-2">
                                    {algorithm.description}
                                </p>

                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="bg-slate-800/60 rounded-lg p-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-slate-400">Time</span>
                                            <Clock className="h-4 w-4 text-slate-500" />
                                        </div>
                                        <span className="font-semibold text-white">{algorithm.timeComplexity}</span>
                                    </div>
                                    <div className="bg-slate-800/60 rounded-lg p-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-slate-400">Space</span>
                                            <Target className="h-4 w-4 text-slate-500" />
                                        </div>
                                        <span className="font-semibold text-white">{algorithm.spaceComplexity}</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <span className="text-sm text-slate-400 mr-2">Requirement:</span>
                                        <span className="text-sm font-medium text-white">{algorithm.requirement}</span>
                                    </div>
                                    <div className="flex items-center text-red-600 group-hover:text-red-700">
                                        <Play className="h-4 w-4 mr-1" />
                                        <span className="text-sm font-medium">Visualize</span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Complexity Comparison */}
                <div className="mt-12 bg-slate-900/70 rounded-2xl border border-slate-700/50 shadow-xl p-8">
                    <h2 className="text-3xl font-bold text-white mb-6 text-center">
                        Time Complexity Comparison
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b-2 border-slate-700/50">
                                    <th className="text-left py-3 px-4 font-semibold text-slate-300">Algorithm</th>
                                    <th className="text-center py-3 px-4 font-semibold text-slate-300">Best Case</th>
                                    <th className="text-center py-3 px-4 font-semibold text-slate-300">Average Case</th>
                                    <th className="text-center py-3 px-4 font-semibold text-slate-300">Worst Case</th>
                                    <th className="text-center py-3 px-4 font-semibold text-slate-300">Space</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                <tr className="hover:bg-slate-800/40">
                                    <td className="py-3 px-4 font-medium">Linear Search</td>
                                    <td className="py-3 px-4 text-center text-green-600 font-medium">O(1)</td>
                                    <td className="py-3 px-4 text-center text-yellow-600 font-medium">O(n)</td>
                                    <td className="py-3 px-4 text-center text-red-600 font-medium">O(n)</td>
                                    <td className="py-3 px-4 text-center text-green-600 font-medium">O(1)</td>
                                </tr>
                                <tr className="hover:bg-slate-800/40">
                                    <td className="py-3 px-4 font-medium">Binary Search</td>
                                    <td className="py-3 px-4 text-center text-green-600 font-medium">O(1)</td>
                                    <td className="py-3 px-4 text-center text-green-600 font-medium">O(log n)</td>
                                    <td className="py-3 px-4 text-center text-green-600 font-medium">O(log n)</td>
                                    <td className="py-3 px-4 text-center text-green-600 font-medium">O(1)</td>
                                </tr>
                                <tr className="hover:bg-slate-800/40">
                                    <td className="py-3 px-4 font-medium">Jump Search</td>
                                    <td className="py-3 px-4 text-center text-green-600 font-medium">O(1)</td>
                                    <td className="py-3 px-4 text-center text-yellow-600 font-medium">O(√n)</td>
                                    <td className="py-3 px-4 text-center text-yellow-600 font-medium">O(√n)</td>
                                    <td className="py-3 px-4 text-center text-green-600 font-medium">O(1)</td>
                                </tr>
                                <tr className="hover:bg-slate-800/40">
                                    <td className="py-3 px-4 font-medium">Interpolation Search</td>
                                    <td className="py-3 px-4 text-center text-green-600 font-medium">O(1)</td>
                                    <td className="py-3 px-4 text-center text-green-600 font-medium">O(log log n)</td>
                                    <td className="py-3 px-4 text-center text-red-600 font-medium">O(n)</td>
                                    <td className="py-3 px-4 text-center text-green-600 font-medium">O(1)</td>
                                </tr>
                                <tr className="hover:bg-slate-800/40">
                                    <td className="py-3 px-4 font-medium">Exponential Search</td>
                                    <td className="py-3 px-4 text-center text-green-600 font-medium">O(1)</td>
                                    <td className="py-3 px-4 text-center text-green-600 font-medium">O(log n)</td>
                                    <td className="py-3 px-4 text-center text-green-600 font-medium">O(log n)</td>
                                    <td className="py-3 px-4 text-center text-green-600 font-medium">O(1)</td>
                                </tr>
                                <tr className="hover:bg-slate-800/40">
                                    <td className="py-3 px-4 font-medium">Fibonacci Search</td>
                                    <td className="py-3 px-4 text-center text-green-600 font-medium">O(1)</td>
                                    <td className="py-3 px-4 text-center text-green-600 font-medium">O(log n)</td>
                                    <td className="py-3 px-4 text-center text-green-600 font-medium">O(log n)</td>
                                    <td className="py-3 px-4 text-center text-green-600 font-medium">O(1)</td>
                                </tr>
                                <tr className="hover:bg-slate-800/40">
                                    <td className="py-3 px-4 font-medium">Ternary Search</td>
                                    <td className="py-3 px-4 text-center text-green-600 font-medium">O(1)</td>
                                    <td className="py-3 px-4 text-center text-green-600 font-medium">O(log₃ n)</td>
                                    <td className="py-3 px-4 text-center text-green-600 font-medium">O(log₃ n)</td>
                                    <td className="py-3 px-4 text-center text-green-600 font-medium">O(1)</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <p className="text-sm text-slate-400 mt-4 text-center">
                        * Interpolation Search requires uniformly distributed sorted data for optimal performance
                    </p>
                </div>

                {/* Call to Action */}
                <div className="mt-12 bg-gradient-to-r from-red-500 to-rose-500 rounded-2xl p-8 text-white text-center">
                    <h2 className="text-3xl font-bold mb-4">Ready to Start Learning?</h2>
                    <p className="text-xl text-red-100 mb-6">
                        Begin with Linear Search to understand the basics, then progress to more advanced algorithms.
                    </p>
                    <Link
                        href="/searching/linear-search"
                        className="inline-flex items-center px-6 py-3 bg-white text-red-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                    >
                        Start with Linear Search
                        <ArrowRight className="h-5 w-5 ml-2" />
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default SearchingPage;
