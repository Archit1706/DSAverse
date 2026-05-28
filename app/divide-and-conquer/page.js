import Link from 'next/link';
import { ArrowLeft, GitMerge, Search, Grid, MapPin } from 'lucide-react';

export const metadata = {
    title: 'Divide & Conquer | DSAverse',
    description: 'Interactive visualizations for Divide & Conquer algorithms — merge sort recursion tree, binary search decision tree, Strassen\'s matrix multiplication, and closest pair of points.',
};

const algorithms = [
    {
        name: 'Merge Sort — Recursion Tree',
        slug: 'merge-sort',
        icon: GitMerge,
        description: 'Watch the recursive split tree grow downward, then see sorted subarrays merge back up level by level.',
        time: 'O(n log n)',
        space: 'O(n)',
        pattern: 'Split & Merge',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Binary Search — Decision Tree',
        slug: 'binary-search',
        icon: Search,
        description: 'See each comparison as a branch in a decision tree — left for smaller, right for larger, until found or eliminated.',
        time: 'O(log n)',
        space: 'O(log n)',
        pattern: 'Halving',
        difficulty: 'Beginner',
        available: true,
    },
    {
        name: "Strassen's Matrix Multiplication",
        slug: 'strassens-matrix-multiplication',
        icon: Grid,
        description: 'Step through all 7 sub-matrix multiplications that replace the naive 8, and watch the result matrix assemble.',
        time: 'O(n^2.807)',
        space: 'O(n²)',
        pattern: '7-Multiply',
        difficulty: 'Advanced',
        available: true,
    },
    {
        name: 'Closest Pair of Points',
        slug: 'closest-pair-of-points',
        icon: MapPin,
        description: 'Geometric D&C: divide the point set by a vertical line, recurse on halves, then check the δ-wide strip for cross-half pairs.',
        time: 'O(n log n)',
        space: 'O(n)',
        pattern: 'Geometric D&C',
        difficulty: 'Advanced',
        available: true,
    },
];

function getDifficultyColor(d) {
    if (d === 'Beginner') return 'bg-green-500/20 text-green-400';
    if (d === 'Intermediate') return 'bg-yellow-500/20 text-yellow-400';
    return 'bg-red-500/20 text-red-400';
}

export default function DivideAndConquerPage() {
    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-sky-600 to-blue-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <Link href="/" className="flex items-center text-white hover:text-sky-200 transition-colors mb-8 w-fit">
                        <ArrowLeft className="h-5 w-5 mr-2" />Back to Home
                    </Link>
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 mb-6">
                            <GitMerge className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Divide &amp; Conquer</h1>
                        <p className="text-xl text-sky-100 max-w-2xl mx-auto">
                            Break a problem into smaller subproblems, solve each recursively, then combine results.
                            The recursion tree makes the structure impossible to miss.
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                    {algorithms.map(algo => {
                        const Icon = algo.icon;
                        const card = (
                            <div className="h-full flex flex-col bg-slate-900/70 rounded-2xl border border-slate-700/50 overflow-hidden hover:border-sky-500/50 transition-colors group">
                                <div className="bg-gradient-to-br from-sky-600 to-blue-700 p-6">
                                    <div className="flex items-center justify-between">
                                        <Icon className="h-8 w-8 text-white" />
                                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getDifficultyColor(algo.difficulty)}`}>
                                            {algo.difficulty}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mt-3">{algo.name}</h3>
                                </div>
                                <div className="flex-1 flex flex-col p-6 gap-4">
                                    <p className="text-slate-400 text-sm leading-relaxed">{algo.description}</p>
                                    <div className="mt-auto space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Time</span>
                                            <code className="bg-sky-500/15 text-sky-400 px-2 py-0.5 rounded text-xs">{algo.time}</code>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Space</span>
                                            <code className="bg-sky-500/15 text-sky-400 px-2 py-0.5 rounded text-xs">{algo.space}</code>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Pattern</span>
                                            <code className="bg-sky-500/15 text-sky-400 px-2 py-0.5 rounded text-xs">{algo.pattern}</code>
                                        </div>
                                    </div>
                                    {algo.available ? (
                                        <div className="flex items-center gap-2 text-sky-400 text-sm font-medium group-hover:text-sky-300 transition-colors">
                                            Start Visualization →
                                        </div>
                                    ) : (
                                        <span className="text-slate-500 text-sm">Coming Soon</span>
                                    )}
                                </div>
                            </div>
                        );
                        return algo.available ? (
                            <Link key={algo.slug} href={`/divide-and-conquer/${algo.slug}`} className="h-full flex flex-col">{card}</Link>
                        ) : (
                            <div key={algo.slug} className="h-full flex flex-col opacity-50 cursor-not-allowed">{card}</div>
                        );
                    })}
                </div>
            </div>

            <div className="border-t border-slate-700/50 bg-slate-900/70">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <h2 className="text-2xl font-bold text-white mb-8 text-center">Why Divide &amp; Conquer?</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                        {[
                            { title: 'Logarithmic Depth', body: 'Halving the problem each level gives O(log n) levels of recursion — the key to efficient algorithms like merge sort and binary search.' },
                            { title: 'Parallelism-Friendly', body: 'Independent subproblems can run in parallel. Merge sort, FFT, and matrix mult all exploit this for hardware-level speedups.' },
                            { title: 'Master Theorem', body: 'T(n) = aT(n/b) + f(n) — one formula governs complexity for all D&C algorithms. Understanding the pattern unlocks analysis instantly.' },
                        ].map(item => (
                            <div key={item.title} className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
                                <h3 className="text-sky-400 font-semibold mb-2">{item.title}</h3>
                                <p className="text-slate-400 leading-relaxed">{item.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
