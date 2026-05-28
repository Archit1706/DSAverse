import Link from 'next/link';
import { ArrowLeft, GitMerge, Layers, Zap, GitBranch } from 'lucide-react';

export const metadata = {
    title: 'Union-Find | DSAverse',
    description: 'Interactive Union-Find visualizations — Quick Find flat array, Quick Union tree pointers, path compression before/after, and union by rank.',
};

const algorithms = [
    {
        name: 'Quick Find',
        slug: 'quick-find',
        icon: Layers,
        description: 'Store a component ID per element. find() is O(1) — just return id[x]. union() is O(n) — scan the entire array and relabel.',
        time: 'O(n) union',
        space: 'O(n)',
        pattern: 'Flat Array',
        difficulty: 'Beginner',
        available: true,
    },
    {
        name: 'Quick Union',
        slug: 'quick-union',
        icon: GitBranch,
        description: 'Store a parent pointer per element. union() is O(1) — just repoint one root. find() follows parent links to the root — O(n) worst case (tall trees).',
        time: 'O(n) find',
        space: 'O(n)',
        pattern: 'Tree Pointers',
        difficulty: 'Beginner',
        available: true,
    },
    {
        name: 'Path Compression',
        slug: 'path-compression',
        icon: Zap,
        description: 'After find(x), point every node on the path directly to the root. Trees flatten dramatically. Amortised cost approaches O(α(n)) — nearly constant.',
        time: 'O(α(n)) amort.',
        space: 'O(n)',
        pattern: 'Flatten on Find',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Union by Rank',
        slug: 'union-by-rank',
        icon: GitMerge,
        description: 'Always attach the shorter tree under the taller one. Rank tracks tree height. Combined with path compression this is the optimal Union-Find.',
        time: 'O(α(n)) amort.',
        space: 'O(n)',
        pattern: 'Height Heuristic',
        difficulty: 'Intermediate',
        available: true,
    },
];

function getDifficultyColor(d) {
    if (d === 'Beginner') return 'bg-green-500/20 text-green-400';
    if (d === 'Intermediate') return 'bg-yellow-500/20 text-yellow-400';
    return 'bg-red-500/20 text-red-400';
}

export default function UnionFindPage() {
    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-purple-600 to-violet-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <Link href="/" className="flex items-center text-white hover:text-purple-200 transition-colors mb-8 w-fit">
                        <ArrowLeft className="h-5 w-5 mr-2" />Back to Home
                    </Link>
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 mb-6">
                            <GitMerge className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Union-Find</h1>
                        <p className="text-xl text-purple-100 max-w-2xl mx-auto">
                            Disjoint Set Union (DSU) — track which elements are in the same connected component.
                            Watch how path compression and union by rank push the cost to near-constant.
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {algorithms.map(algo => {
                        const Icon = algo.icon;
                        const card = (
                            <div className="h-full flex flex-col bg-slate-900/70 rounded-2xl border border-slate-700/50 overflow-hidden hover:border-purple-500/50 transition-colors group">
                                <div className="bg-gradient-to-br from-purple-600 to-violet-700 p-6">
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
                                            <code className="bg-purple-500/15 text-purple-400 px-2 py-0.5 rounded text-xs">{algo.time}</code>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Space</span>
                                            <code className="bg-purple-500/15 text-purple-400 px-2 py-0.5 rounded text-xs">{algo.space}</code>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Pattern</span>
                                            <code className="bg-purple-500/15 text-purple-400 px-2 py-0.5 rounded text-xs">{algo.pattern}</code>
                                        </div>
                                    </div>
                                    {algo.available ? (
                                        <div className="flex items-center gap-2 text-purple-400 text-sm font-medium group-hover:text-purple-300 transition-colors">
                                            Start Visualization →
                                        </div>
                                    ) : (
                                        <span className="text-slate-500 text-sm">Coming Soon</span>
                                    )}
                                </div>
                            </div>
                        );
                        return algo.available ? (
                            <Link key={algo.slug} href={`/union-find/${algo.slug}`} className="h-full flex flex-col">{card}</Link>
                        ) : (
                            <div key={algo.slug} className="h-full flex flex-col opacity-50 cursor-not-allowed">{card}</div>
                        );
                    })}
                </div>
            </div>

            <div className="border-t border-slate-700/50 bg-slate-900/70">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <h2 className="text-2xl font-bold text-white mb-8 text-center">Why Union-Find?</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                        {[
                            { title: 'Near-Constant Time', body: 'With path compression + union by rank, each operation costs O(α(n)) — the inverse Ackermann function. For all practical n, α(n) ≤ 4. Effectively O(1) per operation.' },
                            { title: 'Kruskal\'s MST', body: "Union-Find is the engine behind Kruskal's algorithm. It checks in O(α(n)) whether adding an edge creates a cycle — enabling an O(E log E) MST algorithm." },
                            { title: 'Dynamic Connectivity', body: 'Track connected components as edges arrive. Union merges two components; find checks if two nodes are already connected. Used in network analysis, image segmentation, and compilers.' },
                        ].map(item => (
                            <div key={item.title} className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
                                <h3 className="text-purple-400 font-semibold mb-2">{item.title}</h3>
                                <p className="text-slate-400 leading-relaxed">{item.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
