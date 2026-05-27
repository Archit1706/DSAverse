import React from 'react';
import Link from 'next/link';
import { Play, GitMerge, Crown, FileSearch, Navigation, Scissors, Target, TreePine } from 'lucide-react';

export const metadata = {
    title: "Backtracking – Interactive Visualizer",
    description: "Visualize backtracking algorithms: N-Queens, Word Search, and Rat in a Maze. Watch the algorithm explore and prune the search space in real time.",
    keywords: ["backtracking", "N-Queens", "word search", "rat in a maze", "constraint satisfaction", "pruning", "search space", "algorithm visualization"],
    openGraph: {
        title: "Backtracking Visualizer – DSAverse",
        description: "Interactive backtracking visualizations with search space exploration and pruning animations.",
        images: [{ url: "/og-image.png" }],
    },
};

const algorithms = [
    {
        name: "N-Queens",
        slug: "n-queens",
        icon: Crown,
        description: "Place N queens on an N×N chessboard so no two attack each other. Backtracking places queens row by row, pruning columns and diagonals that would cause conflicts.",
        timeComplexity: "O(n!)",
        spaceComplexity: "O(n²)",
        difficulty: "Advanced",
        pattern: "Constraint Propagation",
        available: true,
    },
    {
        name: "Word Search",
        slug: "word-search",
        icon: FileSearch,
        description: "Find a word in a 2D character grid by exploring all four directions from each cell. Backtracking un-marks visited cells when a path fails, enabling complete search.",
        timeComplexity: "O(m×n×4^L)",
        spaceComplexity: "O(L)",
        difficulty: "Intermediate",
        pattern: "Grid DFS",
        available: true,
    },
    {
        name: "Rat in a Maze",
        slug: "rat-in-a-maze",
        icon: Navigation,
        description: "Navigate a rat from the top-left to bottom-right of a binary maze grid. Backtracking explores all paths, marking cells visited and unmarking them when a dead end is hit.",
        timeComplexity: "O(2^(n²))",
        spaceComplexity: "O(n²)",
        difficulty: "Intermediate",
        pattern: "Path Finding",
        available: true,
    },
];

const getDifficultyColor = (d) => {
    if (d === 'Beginner') return 'bg-green-500/15 text-green-400';
    if (d === 'Intermediate') return 'bg-yellow-500/15 text-yellow-400';
    return 'bg-red-500/15 text-red-400';
};

const getPatternColor = () => 'bg-indigo-500/15 text-indigo-400';

export default function BacktrackingPage() {
    return (
        <div className="min-h-screen bg-slate-950">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="text-center">
                        <h1 className="text-4xl md:text-6xl font-bold mb-6">Backtracking</h1>
                        <p className="text-xl text-indigo-100 mb-8 max-w-3xl mx-auto">
                            Explore every possibility — but prune dead ends early. Backtracking is a systematic
                            trial-and-error approach that finds solutions by building candidates incrementally.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full"><Play className="h-4 w-4" />Interactive Visualizations</div>
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full"><Scissors className="h-4 w-4" />Pruning Animations</div>
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full"><TreePine className="h-4 w-4" />Search Tree View</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Core concepts */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                    {[
                        { icon: GitMerge, title: "Choose → Explore → Unchoose", body: "The core backtracking loop: make a choice, recurse into it, then undo the choice if it leads to a dead end." },
                        { icon: Scissors, title: "Constraint Pruning", body: "Early constraint checks avoid exploring entire subtrees that cannot lead to valid solutions — the difference between feasibility and infeasibility." },
                        { icon: Target, title: "Complete Search", body: "Backtracking guarantees finding all valid solutions (or proving none exist), making it ideal for constraint satisfaction problems." },
                    ].map(c => (
                        <div key={c.title} className="bg-slate-900/70 rounded-xl p-6 border border-slate-700/50 text-center">
                            <div className="w-14 h-14 bg-indigo-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                                <c.icon className="h-7 w-7 text-indigo-500" />
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
                    <p className="text-slate-400">Watch the algorithm explore, backtrack, and find solutions in real time</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {algorithms.map((algo) => {
                        const Icon = algo.icon;
                        const card = (
                            <div className="h-full flex flex-col bg-slate-900/70 rounded-xl border border-slate-700/50 hover:shadow-xl transition-all duration-300 hover:scale-105 hover:border-indigo-500/50 overflow-hidden">
                                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6">
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
                                            <code className="bg-indigo-500/15 text-indigo-400 px-2 py-0.5 rounded text-xs">{algo.timeComplexity}</code>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-medium text-slate-400">Space:</span>
                                            <code className="bg-indigo-500/15 text-indigo-400 px-2 py-0.5 rounded text-xs">{algo.spaceComplexity}</code>
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
                                            <div className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 text-sm hover:from-indigo-700 hover:to-purple-700 transition-all">
                                                <Play className="h-4 w-4" />Start Visualization
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                        return (
                            <Link key={algo.slug} href={`/backtracking/${algo.slug}`} className="h-full flex flex-col">{card}</Link>
                        );
                    })}
                </div>
            </div>

            {/* Why learn */}
            <div className="bg-slate-900/70 border-t border-slate-700/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <h2 className="text-3xl font-bold text-white mb-3 text-center">Why Learn Backtracking?</h2>
                    <p className="text-slate-400 text-center mb-12">The foundation of constraint satisfaction, puzzles, and combinatorial search</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { title: "Constraint Satisfaction", body: "Sudoku, crossword generation, scheduling, and register allocation all reduce to backtracking over constrained variables." },
                            { title: "Game Playing", body: "Minimax search, chess engine move generation, and puzzle solvers are all forms of backtracking with constraint pruning." },
                            { title: "Combinatorics", body: "Generating permutations, subsets, and combinations systematically is the cleanest application of the choose-explore-unchoose pattern." },
                        ].map(c => (
                            <div key={c.title} className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/30">
                                <h3 className="font-semibold text-indigo-400 mb-2">{c.title}</h3>
                                <p className="text-slate-400 text-sm">{c.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
