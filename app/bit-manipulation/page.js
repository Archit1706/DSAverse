import React from 'react';
import Link from 'next/link';
import { Play, Cpu, Zap, Hash, ToggleLeft, Eye, Binary, FlipHorizontal } from 'lucide-react';

export const metadata = {
    title: "Bit Manipulation – Interactive Visualizer",
    description: "Visualize bit manipulation algorithms: Single Number (XOR), Count Set Bits (Brian Kernighan), and Power of Two. Understand bitwise operations with binary-level animations.",
    keywords: ["bit manipulation", "XOR", "set bits", "Brian Kernighan", "power of two", "bitwise", "algorithm visualization"],
    openGraph: {
        title: "Bit Manipulation Visualizer – DSAverse",
        description: "Interactive bit manipulation visualizations with binary register animations.",
        images: [{ url: "/og-image.png" }],
    },
};

const algorithms = [
    {
        name: "Single Number (XOR)",
        slug: "single-number",
        icon: Zap,
        description: "Find the one element that appears only once in an array where every other element appears twice. XOR cancels duplicate pairs in a single linear pass.",
        timeComplexity: "O(n)",
        spaceComplexity: "O(1)",
        difficulty: "Beginner",
        pattern: "XOR Trick",
        available: true,
    },
    {
        name: "Count Set Bits",
        slug: "count-set-bits",
        icon: Hash,
        description: "Count the number of 1-bits in an integer using Brian Kernighan's algorithm. Each iteration n & (n−1) clears the lowest set bit, running in O(set bits) time.",
        timeComplexity: "O(log n)",
        spaceComplexity: "O(1)",
        difficulty: "Beginner",
        pattern: "Bit Clearing",
        available: true,
    },
    {
        name: "Power of Two",
        slug: "power-of-two",
        icon: ToggleLeft,
        description: "Check whether a number is a power of two using the elegant n & (n−1) == 0 trick. Powers of two have exactly one set bit — flipping it produces zero.",
        timeComplexity: "O(1)",
        spaceComplexity: "O(1)",
        difficulty: "Beginner",
        pattern: "Single Set Bit",
        available: true,
    },
];

const getDifficultyColor = (d) => {
    if (d === 'Beginner') return 'bg-green-500/15 text-green-400';
    if (d === 'Intermediate') return 'bg-yellow-500/15 text-yellow-400';
    return 'bg-red-500/15 text-red-400';
};

const getPatternColor = () => 'bg-teal-500/15 text-teal-400';

export default function BitManipulationPage() {
    return (
        <div className="min-h-screen bg-slate-950">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-600 to-cyan-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="text-center">
                        <h1 className="text-4xl md:text-6xl font-bold mb-6">Bit Manipulation</h1>
                        <p className="text-xl text-teal-100 mb-8 max-w-3xl mx-auto">
                            Master the art of working directly with bits. These O(1) and O(n) tricks
                            unlock elegant solutions that would otherwise require loops or extra space.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full"><Play className="h-4 w-4" />Interactive Visualizations</div>
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full"><Eye className="h-4 w-4" />Binary Register View</div>
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full"><Cpu className="h-4 w-4" />Bitwise Operations</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Core concepts */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                    {[
                        { icon: Zap, title: "XOR Properties", body: "a ^ a = 0, a ^ 0 = a. XOR is commutative and associative — perfect for cancelling duplicates." },
                        { icon: Hash, title: "n & (n−1) Trick", body: "Clears the lowest set bit of n. Applying repeatedly counts set bits; checking for zero detects powers of two." },
                        { icon: FlipHorizontal, title: "Constant Time", body: "Bitwise operations execute in a single CPU cycle, making bit tricks some of the fastest algorithms possible." },
                    ].map(c => (
                        <div key={c.title} className="bg-slate-900/70 rounded-xl p-6 border border-slate-700/50 text-center">
                            <div className="w-14 h-14 bg-teal-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                                <c.icon className="h-7 w-7 text-teal-500" />
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
                    <p className="text-slate-400">Explore bitwise tricks with step-by-step binary animations</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {algorithms.map((algo) => {
                        const Icon = algo.icon;
                        const card = (
                            <div className="h-full flex flex-col bg-slate-900/70 rounded-xl border border-slate-700/50 hover:shadow-xl transition-all duration-300 hover:scale-105 hover:border-teal-500/50 overflow-hidden">
                                <div className="bg-gradient-to-br from-teal-600 to-cyan-700 p-6">
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
                                            <code className="bg-teal-500/15 text-teal-400 px-2 py-0.5 rounded text-xs">{algo.timeComplexity}</code>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-medium text-slate-400">Space:</span>
                                            <code className="bg-teal-500/15 text-teal-400 px-2 py-0.5 rounded text-xs">{algo.spaceComplexity}</code>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-medium text-slate-400">Difficulty:</span>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(algo.difficulty)}`}>{algo.difficulty}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-medium text-slate-400">Pattern:</span>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPatternColor()}`}>{algo.pattern}</span>
                                        </div>
                                        <div className="pt-2">
                                            <div className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 text-sm hover:from-teal-700 hover:to-cyan-700 transition-all">
                                                <Play className="h-4 w-4" />Start Visualization
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                        return (
                            <Link key={algo.slug} href={`/bit-manipulation/${algo.slug}`} className="h-full flex flex-col">{card}</Link>
                        );
                    })}
                </div>
            </div>

            {/* Why learn */}
            <div className="bg-slate-900/70 border-t border-slate-700/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <h2 className="text-3xl font-bold text-white mb-3 text-center">Why Learn Bit Manipulation?</h2>
                    <p className="text-slate-400 text-center mb-12">The secret weapon of competitive programmers and systems engineers</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { title: "Interview Edge", body: "Bit tricks appear in FAANG interviews as elegant one-liners that replace O(n) space with O(1). Recognizing the pattern is half the battle." },
                            { title: "Systems Programming", body: "Flags, masks, and packed data are everywhere in OS kernels, network protocols, graphics, and embedded systems." },
                            { title: "Competitive Programming", body: "Bitmask DP, subset enumeration, and fast popcount are essential tools for competitive programming problems with tight constraints." },
                        ].map(c => (
                            <div key={c.title} className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/30">
                                <h3 className="font-semibold text-teal-400 mb-2">{c.title}</h3>
                                <p className="text-slate-400 text-sm">{c.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
