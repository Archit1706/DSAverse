export const metadata = {
    title: "Breadth-First Search Visualizer – Level-by-Level Graph Traversal",
    description: "Interactively visualize BFS on a graph: watch nodes being discovered level by level using a queue. Understand O(V+E) complexity, shortest path guarantees, and the difference between BFS and DFS.",
    keywords: ["breadth first search", "BFS", "BFS visualization", "graph traversal", "level order traversal", "shortest path", "queue", "O(V+E)", "graph algorithm animation"],
    openGraph: {
        title: "BFS Visualizer – DSAverse",
        description: "Step-by-step Breadth-First Search with queue panel, distance labels, and traversal order animation.",
        images: [{ url: "/og-image.png" }],
    },
};
export default function Layout({ children }) { return children; }
