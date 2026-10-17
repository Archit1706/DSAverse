import Link from 'next/link';
import { ArrowLeft, Table, Hash, Table2, Columns3, ListTree, Network, Binary, TreePine, RotateCcw, Type, Shuffle, Construction } from 'lucide-react';

export const metadata = {
    // Just the name: the root layout's "%s | DSAverse" template adds the
    // suffix. Spelling it out here would double it.
    title: 'Indexing',
    description: 'Interactive visualizations for hash tables, B-trees, and the other structures that turn a linear scan into a fast lookup.',
};

/* Cards come in three flavours:
     - built here          -> links to /indexing/<slug>
     - covered elsewhere   -> `href` + `coveredIn` link out to the existing page
     - not built yet       -> available: false, renders as a dead Coming Soon card
   The order mirrors data/algorithmCategories.js. */
const algorithms = [
    {
        name: 'Binary and Linear Search',
        slug: 'binary-and-linear-search',
        href: '/searching/binary-search',
        coveredIn: 'Searching',
        icon: Binary,
        description: 'The baseline every index is measured against — scan every element, or halve the range each comparison.',
        time: 'O(n) / O(log n)',
        space: 'O(1)',
        pattern: 'Scan / Halving',
        difficulty: 'Beginner',
        available: true,
    },
    {
        name: 'Binary Search Trees',
        slug: 'binary-search-trees',
        href: '/trees/binary-search-tree',
        coveredIn: 'Trees',
        icon: TreePine,
        description: 'Ordered nodes that give O(log n) lookups when balanced — and O(n) when they are not.',
        time: 'O(log n) avg',
        space: 'O(n)',
        pattern: 'Tree Traversal',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'AVL Trees',
        slug: 'avl-trees',
        href: '/trees/avl-tree',
        coveredIn: 'Trees',
        icon: RotateCcw,
        description: 'The first self-balancing BST: rotations keep height logarithmic no matter the insertion order.',
        time: 'O(log n)',
        space: 'O(n)',
        pattern: 'Rotations',
        difficulty: 'Advanced',
        available: true,
    },
    {
        name: 'Red-Black Trees',
        slug: 'red-black-trees',
        icon: Network,
        description: 'Balance by colouring rather than strict height, trading slightly taller trees for cheaper inserts.',
        time: 'O(log n)',
        space: 'O(n)',
        pattern: 'Recolour / Rotate',
        difficulty: 'Advanced',
        available: false,
    },
    {
        name: 'Splay Trees',
        slug: 'splay-trees',
        icon: Shuffle,
        description: 'Self-adjusting tree that rotates every accessed node to the root, making hot keys progressively cheaper.',
        time: 'O(log n) amortised',
        space: 'O(n)',
        pattern: 'Splaying',
        difficulty: 'Advanced',
        available: false,
    },
    {
        name: 'Open Hash Tables',
        slug: 'open-hash-tables',
        icon: Hash,
        description: 'Separate chaining: every slot holds a list, so collisions extend a chain instead of hunting for space.',
        time: 'O(1) avg',
        space: 'O(n)',
        pattern: 'Separate Chaining',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Closed Hash Tables',
        slug: 'closed-hash-tables',
        icon: Table2,
        description: 'Open addressing: every key lives in the table itself, probing forward until it finds a free slot.',
        time: 'O(1) avg',
        space: 'O(n)',
        pattern: 'Open Addressing',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Closed Hash Tables with Buckets',
        slug: 'closed-hash-tables-with-buckets',
        icon: Columns3,
        description: 'Each slot is a small fixed bucket — fewer probes, better cache behaviour, and an overflow area when a bucket fills.',
        time: 'O(1) avg',
        space: 'O(n)',
        pattern: 'Bucketed Probing',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Trie (Prefix Tree)',
        slug: 'trie-prefix-tree',
        href: '/trees/trie',
        coveredIn: 'Trees',
        icon: Type,
        description: 'Keys become paths of characters, so lookup costs the length of the key rather than the size of the set.',
        time: 'O(m)',
        space: 'O(n×m)',
        pattern: 'Prefix Path',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Radix Tree',
        slug: 'radix-tree',
        icon: ListTree,
        description: 'A trie with single-child chains collapsed into one edge, cutting the node count on sparse key sets.',
        time: 'O(m)',
        space: 'O(n)',
        pattern: 'Path Compression',
        difficulty: 'Advanced',
        available: false,
    },
    {
        name: 'Ternary Search Tree',
        slug: 'ternary-search-tree',
        icon: Network,
        description: 'A trie-BST hybrid: three children per node instead of one per alphabet symbol, trading speed for memory.',
        time: 'O(log n + m)',
        space: 'O(n)',
        pattern: 'Three-way Branch',
        difficulty: 'Advanced',
        available: false,
    },
    {
        name: 'B Trees',
        slug: 'b-trees',
        icon: ListTree,
        description: 'Wide nodes that keep the tree shallow, splitting and promoting keys upward so every leaf stays the same depth.',
        time: 'O(log n)',
        space: 'O(n)',
        pattern: 'Split / Promote',
        difficulty: 'Advanced',
        available: true,
    },
    {
        name: 'B+ Trees',
        slug: 'b-plus-trees',
        icon: Table,
        description: 'The database index: all values live in linked leaves, so range scans walk sideways instead of back up the tree.',
        time: 'O(log n)',
        space: 'O(n)',
        pattern: 'Linked Leaves',
        difficulty: 'Advanced',
        available: true,
    },
];

const getDifficultyColor = (d) => {
    if (d === 'Beginner') return 'bg-green-500/15 text-green-400';
    if (d === 'Intermediate') return 'bg-yellow-500/15 text-yellow-400';
    return 'bg-red-500/15 text-red-400';
};

export default function IndexingPage() {
    return (
        <div className="min-h-screen bg-slate-950">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <Link href="/" className="flex items-center text-white hover:text-emerald-200 transition-colors mb-8 w-fit">
                        <ArrowLeft className="h-5 w-5 mr-2" />Back to Home
                    </Link>
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 mb-6">
                            <Table className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Indexing</h1>
                        <p className="text-xl text-emerald-100 max-w-3xl mx-auto">
                            Every fast lookup is an index underneath. Watch hash tables absorb collisions and B-trees
                            split their way to a shallow, balanced shape.
                        </p>
                    </div>
                </div>
            </div>

            {/* Cards */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {algorithms.map(algo => {
                        const Icon = algo.available ? algo.icon : Construction;
                        const card = (
                            <div className="h-full flex flex-col bg-slate-900/70 rounded-2xl border border-slate-700/50 overflow-hidden hover:border-emerald-500/50 transition-colors group">
                                <div className={`bg-gradient-to-br from-emerald-600 to-teal-700 p-6 ${!algo.available ? 'opacity-60' : ''}`}>
                                    <div className="flex items-center justify-between">
                                        <Icon className="h-8 w-8 text-white" />
                                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getDifficultyColor(algo.difficulty)}`}>
                                            {algo.difficulty}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mt-3">{algo.name}</h3>
                                    {algo.coveredIn && (
                                        <span className="text-xs text-emerald-200/80">Covered in {algo.coveredIn}</span>
                                    )}
                                    {!algo.available && (
                                        <span className="text-xs text-emerald-200/70">Coming Soon</span>
                                    )}
                                </div>
                                <div className="flex-1 flex flex-col p-6 gap-4">
                                    <p className="text-slate-400 text-sm leading-relaxed">{algo.description}</p>
                                    <div className="mt-auto space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Time</span>
                                            <code className="bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded text-xs">{algo.time}</code>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Space</span>
                                            <code className="bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded text-xs">{algo.space}</code>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Pattern</span>
                                            <code className="bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded text-xs">{algo.pattern}</code>
                                        </div>
                                    </div>
                                    {!algo.available ? (
                                        <span className="text-slate-500 text-sm">Coming Soon</span>
                                    ) : (
                                        <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium group-hover:text-emerald-300 transition-colors">
                                            {algo.coveredIn ? `Open in ${algo.coveredIn} →` : 'Start Visualization →'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                        return algo.available ? (
                            <Link key={algo.slug} href={algo.href ?? `/indexing/${algo.slug}`} className="h-full flex flex-col">{card}</Link>
                        ) : (
                            <div key={algo.slug} className="h-full flex flex-col opacity-50 cursor-not-allowed">{card}</div>
                        );
                    })}
                </div>
            </div>

            {/* Why Learn */}
            <div className="border-t border-slate-700/50 bg-slate-900/70">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <h2 className="text-2xl font-bold text-white mb-8 text-center">Why Learn Indexing?</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                        {[
                            { title: 'Every Database Runs On It', body: 'A B+ tree sits under almost every primary key you have ever queried. Knowing its shape explains why some queries are instant and others crawl.' },
                            { title: 'O(1) Is Not Free', body: 'Hash tables average constant time only while the load factor stays low and the hash spreads keys evenly. Watching collisions pile up shows where that promise breaks.' },
                            { title: 'Disk Changes The Maths', body: 'B-trees exist because reading a block costs the same as reading a byte. Wide, shallow trees are what you build when the bottleneck is I/O, not comparisons.' },
                        ].map(item => (
                            <div key={item.title} className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
                                <h3 className="text-emerald-400 font-semibold mb-2">{item.title}</h3>
                                <p className="text-slate-400 leading-relaxed">{item.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
