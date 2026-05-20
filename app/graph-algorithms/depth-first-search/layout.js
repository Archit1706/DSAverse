export const metadata = {
    title: "Depth-First Search Visualizer – Recursive Graph Traversal",
    description: "Interactively visualize DFS on a graph: watch the algorithm plunge deep into each branch then backtrack using a call stack. Understand O(V+E) complexity, cycle detection, and topological sort foundations.",
    keywords: ["depth first search", "DFS", "DFS visualization", "graph traversal", "backtracking", "call stack", "cycle detection", "topological sort", "O(V+E)", "graph algorithm animation"],
    openGraph: {
        title: "DFS Visualizer – DSAverse",
        description: "Step-by-step Depth-First Search with call stack panel, backtracking visualization, and traversal order animation.",
        images: [{ url: "/og-image.png" }],
    },
};
export default function Layout({ children }) { return children; }
