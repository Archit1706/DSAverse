export const metadata = {
    title: "Floyd-Warshall Visualizer – All-Pairs Shortest Path",
    description: "Visualize the Floyd-Warshall algorithm computing shortest paths between every pair of nodes. Watch the distance matrix evolve as each intermediate node k is considered and paths are relaxed.",
    keywords: ["floyd-warshall", "all pairs shortest path", "dynamic programming", "distance matrix", "shortest path", "algorithm visualization"],
    openGraph: {
        title: "Floyd-Warshall Visualizer – DSAverse",
        description: "Watch the all-pairs distance matrix evolve as each intermediate node is considered and shorter paths are relaxed.",
        images: [{ url: "/og-image.png" }],
    },
    alternates: { canonical: "/graph-algorithms/floyd-warshall" },
};
export default function Layout({ children }) { return children; }
