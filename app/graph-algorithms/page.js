import React from 'react';
import Link from 'next/link';
import { Play, Clock, GitBranch, Navigation, Network, Link2, Share2, Grid3X3, ArrowDownNarrowWide, Scissors, Wifi } from 'lucide-react';

export const metadata = {
    title: "Graph Algorithms – Visualizer & Complexity Guide",
    description: "Interactive visualizations for graph algorithms including BFS, DFS, Dijkstra's Shortest Path, Prim's MST, and more. Step through traversals and understand graph theory.",
    keywords: ["graph algorithms", "BFS", "DFS", "Dijkstra", "Prim", "Kruskal", "topological sort", "algorithm visualization"],
    openGraph: {
        title: "Graph Algorithms Visualizer – DSAverse",
        description: "Step-by-step interactive graph algorithm visualizations with complexity analysis.",
        images: [{ url: "/og-image.png" }],
    },
};

const graphAlgorithms = [
    {
        name: "Breadth-First Search",
        slug: "breadth-first-search",
        icon: Wifi,
        description: "Explores a graph level by level, visiting all neighbors of a node before moving to the next level. Uses a queue and guarantees shortest paths in unweighted graphs.",
        timeComplexity: "O(V + E)",
        spaceComplexity: "O(V)",
        category: "Traversal",
        available: true
    },
    {
        name: "Depth-First Search",
        slug: "depth-first-search",
        icon: GitBranch,
        description: "Explores as far as possible along each branch before backtracking. Uses a stack (or recursion) and is the foundation for cycle detection, topological sort, and more.",
        timeComplexity: "O(V + E)",
        spaceComplexity: "O(V)",
        category: "Traversal",
        available: true
    },
    {
        name: "Dijkstra's Shortest Path",
        slug: "dijkstras-shortest-path",
        icon: Navigation,
        description: "Finds the shortest path from a source node to all other nodes in a weighted graph with non-negative edges. Uses a greedy approach with a priority queue.",
        timeComplexity: "O((V + E) log V)",
        spaceComplexity: "O(V)",
        category: "Shortest Path",
        available: true
    },
    {
        name: "Connected Components",
        slug: "connected-components",
        icon: Share2,
        description: "Identifies all groups of nodes that are connected to each other in an undirected graph. Can be found using BFS or DFS.",
        timeComplexity: "O(V + E)",
        spaceComplexity: "O(V)",
        category: "Traversal",
        available: true
    },
    {
        name: "Prim's Minimum Spanning Tree",
        slug: "prims-minimum-spanning-tree",
        icon: Network,
        description: "Finds the minimum spanning tree of a weighted undirected graph using a greedy algorithm. Starts from an arbitrary node and grows the tree by adding the cheapest edge.",
        timeComplexity: "O((V + E) log V)",
        spaceComplexity: "O(V)",
        category: "MST",
        available: true
    },
    {
        name: "Topological Sort",
        slug: "topological-sort-indegree",
        icon: ArrowDownNarrowWide,
        description: "Orders nodes in a Directed Acyclic Graph such that every directed edge goes from earlier to later in the ordering. Essential for task scheduling and dependency resolution.",
        timeComplexity: "O(V + E)",
        spaceComplexity: "O(V)",
        category: "Ordering",
        available: true
    },
    {
        name: "Floyd-Warshall",
        slug: "floyd-warshall",
        icon: Grid3X3,
        description: "Finds shortest paths between all pairs of nodes in a weighted graph. Uses dynamic programming and works with negative weights (but not negative cycles).",
        timeComplexity: "O(V³)",
        spaceComplexity: "O(V²)",
        category: "Shortest Path",
        available: true
    },
    {
        name: "Kruskal's MST",
        slug: "kruskal-minimum-spanning-tree",
        icon: Scissors,
        description: "Finds the minimum spanning tree by sorting all edges by weight and greedily adding edges that don't create a cycle. Uses Union-Find data structure.",
        timeComplexity: "O(E log E)",
        spaceComplexity: "O(V)",
        category: "MST",
        available: true
    },
    {
        name: "Topological Sort (DFS)",
        slug: "topological-sort-dfs",
        icon: Link2,
        description: "DFS-based topological ordering: run DFS and push each node to a stack on completion. Reverse of the completion order gives a valid topological ordering.",
        timeComplexity: "O(V + E)",
        spaceComplexity: "O(V)",
        category: "Ordering",
        available: true
    },
];

const getCategoryColor = (cat) => {
    switch (cat) {
        case 'Traversal': return 'bg-cyan-500/15 text-cyan-400';
        case 'Shortest Path': return 'bg-blue-500/15 text-blue-400';
        case 'MST': return 'bg-emerald-500/15 text-emerald-400';
        case 'Ordering': return 'bg-purple-500/15 text-purple-400';
        default: return 'bg-slate-700/60 text-slate-400';
    }
};

export default function GraphAlgorithmsPage() {
    return (
        <div className="min-h-screen bg-slate-950">
            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-600 to-sky-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="text-center">
                        <h1 className="text-4xl md:text-6xl font-bold mb-6">Graph Algorithms</h1>
                        <p className="text-xl text-cyan-100 mb-8 max-w-3xl mx-auto">
                            Explore graphs through interactive visualizations. Watch how algorithms traverse
                            nodes and edges to find paths, components, and optimal structures.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                                <Play className="h-4 w-4" />
                                Step-by-step Traversal
                            </div>
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                                <Network className="h-4 w-4" />
                                Graph Visualization
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
                    {graphAlgorithms.map((algo) => {
                        const Icon = algo.icon;
                        const card = (
                            <div className="h-full flex flex-col bg-slate-900/70 rounded-xl border border-slate-700/50 hover:shadow-xl transition-all duration-300 hover:scale-105 hover:border-cyan-500/50 overflow-hidden">
                                <div className="bg-gradient-to-br from-cyan-600 to-sky-700 p-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                                            <Icon className="h-5 w-5 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white leading-tight">{algo.name}</h3>
                                            {!algo.available && (
                                                <span className="text-xs text-cyan-200/70 font-medium">Coming Soon</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6 flex-1 flex flex-col">
                                    <p className="text-slate-400 text-sm leading-relaxed flex-1 mb-4">
                                        {algo.description}
                                    </p>
                                    <div className="space-y-2 mt-auto">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-medium text-slate-400">Time:</span>
                                            <code className="bg-cyan-500/15 text-cyan-400 px-2 py-0.5 rounded text-xs">{algo.timeComplexity}</code>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-medium text-slate-400">Space:</span>
                                            <code className="bg-cyan-500/15 text-cyan-400 px-2 py-0.5 rounded text-xs">{algo.spaceComplexity}</code>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-medium text-slate-400">Category:</span>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(algo.category)}`}>{algo.category}</span>
                                        </div>
                                        <div className="pt-2">
                                            {algo.available ? (
                                                <div className="w-full bg-gradient-to-r from-cyan-600 to-sky-600 text-white px-4 py-2 rounded-lg font-medium hover:from-cyan-700 hover:to-sky-700 transition-all duration-200 flex items-center justify-center gap-2 text-sm">
                                                    <Play className="h-4 w-4" />Start Visualization
                                                </div>
                                            ) : (
                                                <div className="w-full bg-slate-700/50 text-slate-500 px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 text-sm cursor-not-allowed">
                                                    Coming Soon
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );

                        return algo.available ? (
                            <Link key={algo.slug} href={`/graph-algorithms/${algo.slug}`} className="h-full flex flex-col">
                                {card}
                            </Link>
                        ) : (
                            <div key={algo.slug} className="h-full flex flex-col">
                                {card}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Concepts Section */}
            <div className="bg-slate-900/70 border-t border-slate-700/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <h2 className="text-3xl font-bold text-white mb-4 text-center">Key Graph Concepts</h2>
                    <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">
                        Understanding these fundamentals will help you master graph algorithm visualizations.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { title: "Vertex (Node)", body: "A fundamental unit in a graph. Each node represents an entity — a city, a person, a state in computation.", icon: "●", color: "text-cyan-400", border: "border-cyan-500/30" },
                            { title: "Edge", body: "A connection between two vertices. Can be directed (one-way) or undirected (two-way), and optionally weighted.", icon: "—", color: "text-sky-400", border: "border-sky-500/30" },
                            { title: "Adjacency", body: "Two nodes are adjacent if there is a direct edge between them. The set of all neighbors defines a node's adjacency list.", icon: "≈", color: "text-blue-400", border: "border-blue-500/30" },
                        ].map(c => (
                            <div key={c.title} className={`bg-slate-800/60 rounded-xl border ${c.border} p-6`}>
                                <div className={`text-3xl font-mono mb-3 ${c.color}`}>{c.icon}</div>
                                <h3 className="text-white font-semibold mb-2">{c.title}</h3>
                                <p className="text-slate-400 text-sm">{c.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
