import Link from 'next/link';
import { ArrowLeft, TreePine, GitBranch, RotateCcw, Layers, Type } from 'lucide-react';

export const metadata = {
    title: 'Trees | DSAverse',
    description: 'Interactive visualizations for BST, AVL trees, binary tree traversals, segment trees, and tries.',
};

const algorithms = [
    {
        name: 'Binary Search Tree',
        slug: 'binary-search-tree',
        icon: TreePine,
        description: 'Insert, search, and delete nodes while maintaining the BST ordering property.',
        time: 'O(log n) avg',
        space: 'O(n)',
        pattern: 'Tree Traversal',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'AVL Tree',
        slug: 'avl-tree',
        icon: RotateCcw,
        description: 'Self-balancing BST that uses rotations (LL, RR, LR, RL) to keep height at O(log n).',
        time: 'O(log n)',
        space: 'O(n)',
        pattern: 'Rotations',
        difficulty: 'Advanced',
        available: true,
    },
    {
        name: 'Binary Tree Traversals',
        slug: 'binary-tree-traversals',
        icon: GitBranch,
        description: 'Visualize Inorder, Preorder, Postorder, and Level-Order traversals with a live call-stack panel.',
        time: 'O(n)',
        space: 'O(h)',
        pattern: 'DFS / BFS',
        difficulty: 'Beginner',
        available: true,
    },
    {
        name: 'Segment Tree',
        slug: 'segment-tree',
        icon: Layers,
        description: 'Range queries and point updates in O(log n) by partitioning the array into tree segments.',
        time: 'O(log n)',
        space: 'O(n)',
        pattern: 'Range Query',
        difficulty: 'Advanced',
        available: true,
    },
    {
        name: 'Trie',
        slug: 'trie',
        icon: Type,
        description: 'Prefix tree for fast word insert, search, and autocomplete — each edge is one character.',
        time: 'O(L)',
        space: 'O(N·L·A)',
        pattern: 'Prefix Tree',
        difficulty: 'Intermediate',
        available: true,
    },
];

function getDifficultyColor(d) {
    if (d === 'Beginner') return 'bg-green-500/20 text-green-400';
    if (d === 'Intermediate') return 'bg-yellow-500/20 text-yellow-400';
    return 'bg-red-500/20 text-red-400';
}

export default function TreesPage() {
    return (
        <div className="min-h-screen bg-slate-950">
            {/* Header */}
            <div className="bg-gradient-to-r from-lime-600 to-green-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <Link href="/" className="flex items-center text-white hover:text-lime-200 transition-colors mb-8 w-fit">
                        <ArrowLeft className="h-5 w-5 mr-2" />Back to Home
                    </Link>
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 mb-6">
                            <TreePine className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Trees</h1>
                        <p className="text-xl text-lime-100 max-w-2xl mx-auto">
                            Hierarchical data structures that power databases, file systems, and compilers.
                            Watch insertions, rotations, and queries unfold node by node.
                        </p>
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {algorithms.map(algo => {
                        const Icon = algo.icon;
                        const card = (
                            <div className="h-full flex flex-col bg-slate-900/70 rounded-2xl border border-slate-700/50 overflow-hidden hover:border-lime-500/50 transition-colors group">
                                <div className="bg-gradient-to-br from-lime-600 to-green-700 p-6">
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
                                            <code className="bg-lime-500/15 text-lime-400 px-2 py-0.5 rounded text-xs">{algo.time}</code>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Space</span>
                                            <code className="bg-lime-500/15 text-lime-400 px-2 py-0.5 rounded text-xs">{algo.space}</code>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Pattern</span>
                                            <code className="bg-lime-500/15 text-lime-400 px-2 py-0.5 rounded text-xs">{algo.pattern}</code>
                                        </div>
                                    </div>
                                    {algo.available ? (
                                        <div className="flex items-center gap-2 text-lime-400 text-sm font-medium group-hover:text-lime-300 transition-colors">
                                            Start Visualization →
                                        </div>
                                    ) : (
                                        <span className="text-slate-500 text-sm">Coming Soon</span>
                                    )}
                                </div>
                            </div>
                        );
                        return algo.available ? (
                            <Link key={algo.slug} href={`/trees/${algo.slug}`} className="h-full flex flex-col">{card}</Link>
                        ) : (
                            <div key={algo.slug} className="h-full flex flex-col opacity-50 cursor-not-allowed">{card}</div>
                        );
                    })}
                </div>
            </div>

            {/* Why Learn */}
            <div className="border-t border-slate-700/50 bg-slate-900/70">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <h2 className="text-2xl font-bold text-white mb-8 text-center">Why Learn Trees?</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                        {[
                            { title: 'Ubiquitous in Systems', body: 'Filesystems, DOM, compilers, and databases all use tree structures internally.' },
                            { title: 'Logarithmic Power', body: 'Balanced trees cut O(n) linear scans down to O(log n), the difference between milliseconds and seconds at scale.' },
                            { title: 'Foundation for Advanced DS', body: 'Heaps, tries, segment trees, and B-trees all build on core tree principles mastered here.' },
                        ].map(item => (
                            <div key={item.title} className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
                                <h3 className="text-lime-400 font-semibold mb-2">{item.title}</h3>
                                <p className="text-slate-400 leading-relaxed">{item.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
