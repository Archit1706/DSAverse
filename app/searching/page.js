import React from 'react';
import Link from 'next/link';
import { ArrowRight, Clock, Code, Play, Search, Target, Zap, TrendingUp, BarChart2, Hash } from 'lucide-react';

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

const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
        case 'Beginner':     return 'bg-green-500/15 text-green-400';
        case 'Intermediate': return 'bg-yellow-500/15 text-yellow-400';
        case 'Advanced':     return 'bg-red-500/15 text-red-400';
        default:             return 'bg-slate-700 text-slate-300';
    }
};

const searchingAlgorithms = [
    {
        name: "Linear Search",
        slug: "linear-search",
        description: "Sequential scan through every element until the target is found. Works on any array — sorted or unsorted.",
        timeComplexity: "O(n)",
        spaceComplexity: "O(1)",
        difficulty: "Beginner",
        requirement: "None",
        icon: <Search className="h-6 w-6" />
    },
    {
        name: "Binary Search",
        slug: "binary-search",
        description: "Halves the search space each iteration by comparing the target with the middle element. The gold standard for sorted arrays.",
        timeComplexity: "O(log n)",
        spaceComplexity: "O(1)",
        difficulty: "Beginner",
        requirement: "Sorted Array",
        icon: <Target className="h-6 w-6" />
    },
    {
        name: "Jump Search",
        slug: "jump-search",
        description: "Jumps ahead by √n steps to find the right block, then scans linearly within that block.",
        timeComplexity: "O(√n)",
        spaceComplexity: "O(1)",
        difficulty: "Intermediate",
        requirement: "Sorted Array",
        icon: <Zap className="h-6 w-6" />
    },
    {
        name: "Interpolation Search",
        slug: "interpolation-search",
        description: "Estimates target position using value proportions — like looking up a name in a phone book.",
        timeComplexity: "O(log log n)",
        spaceComplexity: "O(1)",
        difficulty: "Intermediate",
        requirement: "Sorted & Uniform",
        icon: <TrendingUp className="h-6 w-6" />
    },
    {
        name: "Exponential Search",
        slug: "exponential-search",
        description: "Doubles the bound (1, 2, 4, 8...) to find a range, then applies binary search within it.",
        timeComplexity: "O(log n)",
        spaceComplexity: "O(1)",
        difficulty: "Intermediate",
        requirement: "Sorted Array",
        icon: <BarChart2 className="h-6 w-6" />
    },
    {
        name: "Fibonacci Search",
        slug: "fibonacci-search",
        description: "Uses Fibonacci numbers to divide the array. Avoids division — uses only addition and subtraction.",
        timeComplexity: "O(log n)",
        spaceComplexity: "O(1)",
        difficulty: "Advanced",
        requirement: "Sorted Array",
        icon: <Hash className="h-6 w-6" />
    },
    {
        name: "Ternary Search",
        slug: "ternary-search",
        description: "Divides the array into three parts using two midpoints, eliminating one third each step.",
        timeComplexity: "O(log₃ n)",
        spaceComplexity: "O(1)",
        difficulty: "Advanced",
        requirement: "Sorted Array",
        icon: <Search className="h-6 w-6" />
    },
    {
        name: "Block Search",
        slug: "block-search",
        description: "Scans block endpoints (step size √n), then searches linearly within the identified block.",
        timeComplexity: "O(√n)",
        spaceComplexity: "O(1)",
        difficulty: "Intermediate",
        requirement: "Sorted Array",
        icon: <Zap className="h-6 w-6" />
    }
];

export default function SearchingPage() {
    return (
        <div className="min-h-screen bg-slate-950">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-rose-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="text-center">
                        <h1 className="text-4xl md:text-6xl font-bold mb-6">Searching Algorithms</h1>
                        <p className="text-xl text-red-100 mb-8 max-w-4xl mx-auto">
                            Master the art of finding elements efficiently — from O(n) linear scans
                            to O(log log n) interpolation. Visualize every comparison step by step.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                                <Clock className="h-4 w-4" /> 8 Algorithms
                            </div>
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                                <Target className="h-4 w-4" /> Interactive Visualizations
                            </div>
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                                <Code className="h-4 w-4" /> Step-by-step Explanations
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

                {/* Algorithm categories */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    {[
                        { label: 'Basic', color: 'border-green-500', textColor: 'text-green-400', items: ['Linear Search', 'No prerequisites', 'Works on any array'] },
                        { label: 'Sorted Array', color: 'border-yellow-500', textColor: 'text-yellow-400', items: ['Binary, Jump, Exponential', 'O(log n) or O(√n) time', 'Divide and conquer'] },
                        { label: 'Specialized', color: 'border-red-500', textColor: 'text-red-400', items: ['Fibonacci, Ternary', 'Interpolation Search', 'Math-based optimizations'] },
                    ].map(cat => (
                        <div key={cat.label} className={`bg-slate-900/70 rounded-xl border border-slate-700/50 border-l-4 ${cat.color} shadow-xl p-6`}>
                            <h3 className={`text-lg font-bold ${cat.textColor} mb-3`}>{cat.label} Algorithms</h3>
                            <ul className="space-y-1.5 text-sm text-slate-300">
                                {cat.items.map(item => <li key={item} className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-slate-500 rounded-full flex-shrink-0" />{item}</li>)}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Algorithm cards grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                    {searchingAlgorithms.map((algorithm, index) => (
                        <Link key={index} href={`/searching/${algorithm.slug}`}
                            className="h-full flex flex-col group">
                            <div className="h-full flex flex-col bg-slate-900/70 rounded-xl border border-slate-700/50 hover:border-red-500/50 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
                                <div className="flex-1 p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-red-500/15 rounded-lg p-2.5 group-hover:bg-red-500/25 transition-colors">
                                                <div className="text-red-400">{algorithm.icon}</div>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-white group-hover:text-red-400 transition-colors">
                                                    {algorithm.name}
                                                </h3>
                                                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(algorithm.difficulty)}`}>
                                                    {algorithm.difficulty}
                                                </span>
                                            </div>
                                        </div>
                                        <ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-red-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
                                    </div>

                                    <p className="text-slate-400 text-sm mb-4 leading-relaxed">{algorithm.description}</p>

                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="bg-slate-800/60 rounded-lg p-2.5 text-center">
                                            <div className="text-sm font-bold text-red-400">{algorithm.timeComplexity}</div>
                                            <div className="text-xs text-slate-500 mt-0.5">Time</div>
                                        </div>
                                        <div className="bg-slate-800/60 rounded-lg p-2.5 text-center">
                                            <div className="text-sm font-bold text-red-400">{algorithm.spaceComplexity}</div>
                                            <div className="text-xs text-slate-500 mt-0.5">Space</div>
                                        </div>
                                        <div className="bg-slate-800/60 rounded-lg p-2.5 text-center">
                                            <div className="text-xs font-bold text-slate-300 leading-tight">{algorithm.requirement}</div>
                                            <div className="text-xs text-slate-500 mt-0.5">Requires</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="px-6 pb-4 flex items-center justify-between border-t border-slate-700/50 pt-3">
                                    <span className="text-sm text-red-400 group-hover:text-red-300 transition-colors font-medium">Visualize →</span>
                                    <Play className="h-4 w-4 text-red-500" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Comparison Table */}
                <div className="bg-slate-900/70 rounded-2xl border border-slate-700/50 shadow-xl p-8 mb-12">
                    <h2 className="text-2xl font-bold text-white mb-6 text-center">Time Complexity Comparison</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b-2 border-slate-700/50">
                                    <th className="text-left py-3 px-4 font-semibold text-slate-200">Algorithm</th>
                                    <th className="text-center py-3 px-4 font-semibold text-red-400">Best</th>
                                    <th className="text-center py-3 px-4 font-semibold text-red-400">Average</th>
                                    <th className="text-center py-3 px-4 font-semibold text-red-400">Worst</th>
                                    <th className="text-center py-3 px-4 font-semibold text-red-400">Space</th>
                                    <th className="text-center py-3 px-4 font-semibold text-red-400">Sorted?</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50 text-slate-400">
                                {[
                                    ['Linear Search',       'O(1)', 'O(n)',       'O(n)',       'O(1)', 'No'],
                                    ['Binary Search',       'O(1)', 'O(log n)',   'O(log n)',   'O(1)', 'Yes'],
                                    ['Jump Search',         'O(1)', 'O(√n)',      'O(√n)',      'O(1)', 'Yes'],
                                    ['Interpolation',       'O(1)', 'O(log log n)','O(n)',      'O(1)', 'Yes*'],
                                    ['Exponential Search',  'O(1)', 'O(log n)',   'O(log n)',   'O(1)', 'Yes'],
                                    ['Fibonacci Search',    'O(1)', 'O(log n)',   'O(log n)',   'O(1)', 'Yes'],
                                    ['Ternary Search',      'O(1)', 'O(log₃ n)', 'O(log₃ n)', 'O(1)', 'Yes'],
                                    ['Block Search',        'O(1)', 'O(√n)',      'O(√n)',      'O(1)', 'Yes'],
                                ].map(([name, best, avg, worst, space, sorted]) => (
                                    <tr key={name} className="hover:bg-slate-800/40 transition-colors">
                                        <td className="py-3 px-4 font-medium text-slate-200">{name}</td>
                                        <td className="py-3 px-4 text-center text-green-400 font-mono">{best}</td>
                                        <td className="py-3 px-4 text-center text-yellow-400 font-mono">{avg}</td>
                                        <td className="py-3 px-4 text-center text-red-400 font-mono">{worst}</td>
                                        <td className="py-3 px-4 text-center text-green-400 font-mono">{space}</td>
                                        <td className="py-3 px-4 text-center">{sorted}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <p className="text-xs text-slate-500 mt-3 text-center">* Interpolation search requires uniformly distributed sorted data for O(log log n)</p>
                    </div>
                </div>

                {/* CTA */}
                <div className="bg-gradient-to-r from-red-500 to-rose-600 rounded-2xl p-8 text-white text-center">
                    <h2 className="text-2xl font-bold mb-3">Start Learning</h2>
                    <p className="text-red-100 mb-6">Begin with Linear Search for the basics, then progress to Binary Search — the algorithm used everywhere.</p>
                    <Link href="/searching/linear-search"
                        className="inline-flex items-center px-6 py-3 bg-white text-red-600 rounded-lg font-semibold hover:bg-red-50 transition-colors">
                        Start with Linear Search
                        <ArrowRight className="h-5 w-5 ml-2" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
