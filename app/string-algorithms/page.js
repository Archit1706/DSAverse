import React from 'react';
import Link from 'next/link';
import { Play, Type, Search, Hash, AlignLeft, Zap, BookOpen } from 'lucide-react';

export const metadata = {
    title: "String Algorithms – Interactive Visualizer",
    description: "Visualize string algorithms: KMP String Matching, Rabin-Karp rolling hash, and Z-Algorithm. Understand efficient pattern matching with step-by-step animations.",
    keywords: ["string algorithms", "KMP", "Knuth-Morris-Pratt", "Rabin-Karp", "Z-algorithm", "pattern matching", "algorithm visualization"],
    openGraph: {
        title: "String Algorithms Visualizer – DSAverse",
        description: "Interactive string algorithm visualizations with failure function and rolling hash animations.",
        images: [{ url: "/og-image.png" }],
    },
};

const algorithms = [
    {
        name: "KMP String Matching",
        slug: "kmp-string-matching",
        icon: Search,
        description: "Knuth-Morris-Pratt avoids redundant comparisons by pre-computing a failure function. When a mismatch occurs, the pattern shifts by the maximum safe amount rather than just one position.",
        timeComplexity: "O(n + m)",
        spaceComplexity: "O(m)",
        difficulty: "Intermediate",
        pattern: "Failure Function",
        available: true,
    },
    {
        name: "Rabin-Karp",
        slug: "rabin-karp",
        icon: Hash,
        description: "Uses a rolling hash to compare a sliding window of the text with the pattern in O(1) per step. Hash collisions trigger a character-by-character verification.",
        timeComplexity: "O(n + m) avg",
        spaceComplexity: "O(1)",
        difficulty: "Intermediate",
        pattern: "Rolling Hash",
        available: true,
    },
    {
        name: "Z-Algorithm",
        slug: "z-algorithm",
        icon: AlignLeft,
        description: "Computes the Z-array where Z[i] is the length of the longest substring starting at i that matches a prefix of the string. Enables linear-time pattern matching without a separate failure function.",
        timeComplexity: "O(n)",
        spaceComplexity: "O(n)",
        difficulty: "Intermediate",
        pattern: "Z-Array",
        available: true,
    },
];

const getDifficultyColor = (d) => {
    if (d === 'Beginner') return 'bg-green-500/15 text-green-400';
    if (d === 'Intermediate') return 'bg-yellow-500/15 text-yellow-400';
    return 'bg-red-500/15 text-red-400';
};

export default function StringAlgorithmsPage() {
    return (
        <div className="min-h-screen bg-slate-950">
            {/* Header */}
            <div className="bg-gradient-to-r from-fuchsia-600 to-pink-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="text-center">
                        <h1 className="text-4xl md:text-6xl font-bold mb-6">String Algorithms</h1>
                        <p className="text-xl text-fuchsia-100 mb-8 max-w-3xl mx-auto">
                            Go beyond brute-force O(n×m) pattern matching. These linear-time algorithms
                            power search engines, DNA sequencers, and text editors.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full"><Play className="h-4 w-4" />Interactive Visualizations</div>
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full"><Zap className="h-4 w-4" />Linear-Time Matching</div>
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full"><BookOpen className="h-4 w-4" />Failure Functions</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Core concepts */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                    {[
                        { icon: Search, title: "Avoid Re-scanning", body: "Naive matching rescans characters already matched. KMP and Z-Algorithm use precomputed tables to skip ahead safely, achieving O(n+m)." },
                        { icon: Hash, title: "Rolling Hash", body: "Rabin-Karp slides a hash window across the text. Updating the hash takes O(1) per step, turning O(n×m) into O(n+m) on average." },
                        { icon: AlignLeft, title: "Prefix Structure", body: "Both KMP's failure function and the Z-array encode information about how a string's prefixes overlap with its substrings — the key to linear matching." },
                    ].map(c => (
                        <div key={c.title} className="bg-slate-900/70 rounded-xl p-6 border border-slate-700/50 text-center">
                            <div className="w-14 h-14 bg-fuchsia-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                                <c.icon className="h-7 w-7 text-fuchsia-500" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2 text-white">{c.title}</h3>
                            <p className="text-slate-400 text-sm">{c.body}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Algorithm grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-white mb-3">Interactive Visualizations</h2>
                    <p className="text-slate-400">Step through each algorithm and see exactly why each comparison is skipped</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {algorithms.map((algo) => {
                        const Icon = algo.icon;
                        const card = (
                            <div className="h-full flex flex-col bg-slate-900/70 rounded-xl border border-slate-700/50 hover:shadow-xl transition-all duration-300 hover:scale-105 hover:border-fuchsia-500/50 overflow-hidden">
                                <div className="bg-gradient-to-br from-fuchsia-600 to-pink-700 p-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <Icon className="h-5 w-5 text-white" />
                                        </div>
                                        <h3 className="text-lg font-bold text-white leading-tight">{algo.name}</h3>
                                    </div>
                                </div>
                                <div className="p-6 flex-1 flex flex-col">
                                    <p className="text-slate-400 text-sm leading-relaxed flex-1 mb-4">{algo.description}</p>
                                    <div className="space-y-2 mt-auto">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-medium text-slate-400">Time:</span>
                                            <code className="bg-fuchsia-500/15 text-fuchsia-400 px-2 py-0.5 rounded text-xs">{algo.timeComplexity}</code>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-medium text-slate-400">Space:</span>
                                            <code className="bg-fuchsia-500/15 text-fuchsia-400 px-2 py-0.5 rounded text-xs">{algo.spaceComplexity}</code>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-medium text-slate-400">Difficulty:</span>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(algo.difficulty)}`}>{algo.difficulty}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-medium text-slate-400">Pattern:</span>
                                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-fuchsia-500/15 text-fuchsia-400">{algo.pattern}</span>
                                        </div>
                                        <div className="pt-2">
                                            <div className="w-full bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 text-sm hover:from-fuchsia-700 hover:to-pink-700 transition-all">
                                                <Play className="h-4 w-4" />Start Visualization
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                        return (
                            <Link key={algo.slug} href={`/string-algorithms/${algo.slug}`} className="h-full flex flex-col">{card}</Link>
                        );
                    })}
                </div>
            </div>

            {/* Why learn */}
            <div className="bg-slate-900/70 border-t border-slate-700/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <h2 className="text-3xl font-bold text-white mb-3 text-center">Why Learn String Algorithms?</h2>
                    <p className="text-slate-400 text-center mb-12">The backbone of search, genomics, and natural language processing</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { title: "Search Engines", body: "Every full-text search — from grep to Ctrl+F — relies on fast pattern matching. KMP and similar algorithms make searching gigabytes of text practical." },
                            { title: "Bioinformatics", body: "DNA and protein sequence alignment requires matching patterns in strings billions of characters long. Linear-time algorithms are not a luxury — they're a necessity." },
                            { title: "Plagiarism & Security", body: "Rolling-hash algorithms power plagiarism detectors and checksum-based file deduplication. Rabin-Karp is the foundation of the rsync delta-transfer algorithm." },
                        ].map(c => (
                            <div key={c.title} className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/30">
                                <h3 className="font-semibold text-fuchsia-400 mb-2">{c.title}</h3>
                                <p className="text-slate-400 text-sm">{c.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
