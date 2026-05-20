export const metadata = {
    title: "Dijkstra's Shortest Path Visualizer – Weighted Graph Animation",
    description: "Interactively visualize Dijkstra's algorithm on a weighted graph: watch edge relaxation, the min-heap priority queue, and the live distance table update step by step. Understand O((V+E) log V) complexity.",
    keywords: ["Dijkstra", "Dijkstra's algorithm", "shortest path", "weighted graph", "graph visualization", "min heap", "priority queue", "edge relaxation", "greedy algorithm", "O(V+E) log V"],
    openGraph: {
        title: "Dijkstra's Shortest Path Visualizer – DSAverse",
        description: "Step-by-step Dijkstra's algorithm with weighted edges, live distance table, and shortest path highlighting.",
        images: [{ url: "/og-image.png" }],
    },
};
export default function Layout({ children }) { return children; }
