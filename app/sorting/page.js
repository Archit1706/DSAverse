import React from 'react';

export const metadata = {
    title: "Sorting Algorithms – Visualizer & Complexity Guide",
    description:
        "Interactive visualizations for 8 sorting algorithms including Bubble Sort, Merge Sort, Quick Sort, and Heap Sort. Compare time and space complexities, step through each algorithm, and view code examples.",
    keywords: ["sorting algorithms", "bubble sort", "merge sort", "quick sort", "heap sort", "insertion sort", "radix sort", "algorithm visualization"],
    openGraph: {
        title: "Sorting Algorithms Visualizer – DSAverse",
        description: "Step-by-step interactive sorting algorithm visualizations with complexity analysis.",
        images: [{ url: "/og-image.png" }],
    },
};
import Link from 'next/link';
import { ArrowRight, Clock, Code, Play, Repeat, Search, GitMerge, Zap, Triangle, Hash, Layers } from 'lucide-react';

const SortingPage = () => {
    const sortingAlgorithms = [
        {
            name: "Bubble Sort",
            slug: "bubble-sort",
            icon: Repeat,
            description: "Simple comparison-based algorithm that repeatedly steps through the list, compares adjacent elements and swaps them if they're in the wrong order.",
            timeComplexity: "O(n²)",
            spaceComplexity: "O(1)",
            difficulty: "Beginner",
            stable: true
        },
        {
            name: "Selection Sort",
            slug: "selection-sort",
            icon: Search,
            description: "Finds the minimum element from the unsorted portion and places it at the beginning, reducing the unsorted region in each pass.",
            timeComplexity: "O(n²)",
            spaceComplexity: "O(1)",
            difficulty: "Beginner",
            stable: false
        },
        {
            name: "Insertion Sort",
            slug: "insertion-sort",
            icon: ArrowRight,
            description: "Builds the sorted array one element at a time by inserting each element into its correct position in the already-sorted portion.",
            timeComplexity: "O(n²)",
            spaceComplexity: "O(1)",
            difficulty: "Beginner",
            stable: true
        },
        {
            name: "Merge Sort",
            slug: "merge-sort",
            icon: GitMerge,
            description: "Divide and conquer algorithm that splits the array into halves, recursively sorts each half, then merges them back in sorted order.",
            timeComplexity: "O(n log n)",
            spaceComplexity: "O(n)",
            difficulty: "Intermediate",
            stable: true
        },
        {
            name: "Quick Sort",
            slug: "quick-sort",
            icon: Zap,
            description: "Efficient divide and conquer algorithm that partitions the array around a pivot, placing elements smaller than the pivot to its left.",
            timeComplexity: "O(n log n)",
            spaceComplexity: "O(log n)",
            difficulty: "Intermediate",
            stable: false
        },
        {
            name: "Heap Sort",
            slug: "heap-sort",
            icon: Triangle,
            description: "Uses a binary max heap data structure to sort elements by repeatedly extracting the maximum and placing it in sorted position.",
            timeComplexity: "O(n log n)",
            spaceComplexity: "O(1)",
            difficulty: "Advanced",
            stable: false
        },
        {
            name: "Radix Sort",
            slug: "radix-sort",
            icon: Hash,
            description: "Non-comparison based sorting that processes individual digits from least to most significant, using counting sort as a subroutine.",
            timeComplexity: "O(d × (n + k))",
            spaceComplexity: "O(n + k)",
            difficulty: "Advanced",
            stable: true
        },
        {
            name: "Bucket Sort",
            slug: "bucket-sort",
            icon: Layers,
            description: "Distributes elements into a fixed number of buckets based on value range, sorts each bucket individually, then concatenates the results.",
            timeComplexity: "O(n + k)",
            spaceComplexity: "O(n + k)",
            difficulty: "Advanced",
            stable: true
        }
    ];

    const getDifficultyColor = (difficulty) => {
        switch (difficulty) {
            case 'Beginner': return 'bg-green-500/15 text-green-400';
            case 'Intermediate': return 'bg-yellow-500/15 text-yellow-400';
            case 'Advanced': return 'bg-red-500/15 text-red-400';
            default: return 'bg-slate-700/60 text-slate-400';
        }
    };

    return (
        <div className="min-h-screen bg-slate-950">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-600 to-amber-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="text-center">
                        <h1 className="text-4xl md:text-6xl font-bold mb-6">
                            Sorting Algorithms
                        </h1>
                        <p className="text-xl text-orange-100 mb-8 max-w-3xl mx-auto">
                            Master the fundamental sorting algorithms through interactive visualizations.
                            Watch how different algorithms organize data step by step.
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

            {/* Algorithms Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {sortingAlgorithms.map((algorithm, index) => {
                        const Icon = algorithm.icon;
                        return (
                            <Link key={index} href={`/sorting/${algorithm.slug}`} className="h-full flex flex-col">
                                <div className="h-full flex flex-col bg-slate-900/70 rounded-xl border border-slate-700/50 hover:shadow-xl transition-all duration-300 hover:scale-105 hover:border-orange-500/50 overflow-hidden">
                                    <div className="bg-gradient-to-br from-orange-600 to-amber-700 p-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                                                <Icon className="h-5 w-5 text-white" />
                                            </div>
                                            <h3 className="text-xl font-bold text-white">{algorithm.name}</h3>
                                        </div>
                                    </div>

                                    <div className="p-6 flex-1 flex flex-col">
                                        <p className="text-slate-400 mb-4 text-sm leading-relaxed flex-1">
                                            {algorithm.description}
                                        </p>

                                        <div className="space-y-3 mt-auto">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium text-slate-300">Time Complexity:</span>
                                                <code className="bg-orange-500/15 text-orange-400 px-2 py-1 rounded text-sm">
                                                    {algorithm.timeComplexity}
                                                </code>
                                            </div>

                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium text-slate-300">Space Complexity:</span>
                                                <code className="bg-orange-500/15 text-orange-400 px-2 py-1 rounded text-sm">
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
                                                <span className="text-sm font-medium text-slate-300">Stable:</span>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${algorithm.stable ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                                                    {algorithm.stable ? 'Yes' : 'No'}
                                                </span>
                                            </div>

                                            <button className="w-full mt-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white px-4 py-2 rounded-lg font-medium hover:from-orange-700 hover:to-amber-700 transition-all duration-200 flex items-center justify-center gap-2">
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
                            Why Learn Sorting Algorithms?
                        </h2>
                        <p className="text-xl text-slate-400 max-w-3xl mx-auto">
                            Sorting algorithms are fundamental to computer science and form the foundation
                            for understanding more complex algorithms and data structures.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="text-center p-6">
                            <div className="w-16 h-16 bg-orange-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Code className="h-8 w-8 text-orange-500" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2 text-white">Algorithm Design</h3>
                            <p className="text-slate-400">
                                Learn different algorithmic paradigms like divide-and-conquer and greedy approaches
                            </p>
                        </div>

                        <div className="text-center p-6">
                            <div className="w-16 h-16 bg-orange-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Clock className="h-8 w-8 text-orange-500" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2 text-white">Time Complexity</h3>
                            <p className="text-slate-400">
                                Understand Big O notation and how to analyze algorithm performance
                            </p>
                        </div>

                        <div className="text-center p-6">
                            <div className="w-16 h-16 bg-orange-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Play className="h-8 w-8 text-orange-500" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2 text-white">Practical Applications</h3>
                            <p className="text-slate-400">
                                Apply sorting in real-world scenarios like databases, search engines, and data processing
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SortingPage;
