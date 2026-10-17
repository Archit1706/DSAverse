export const metadata = {
    title: "Connected Components Visualizer",
    description: "Visualize how connected components are found in an undirected graph by running BFS/DFS from each unvisited node. Step through the traversal and watch each component get colored.",
    keywords: ["connected components", "graph", "BFS", "DFS", "undirected graph", "traversal", "algorithm visualization"],
    openGraph: {
        title: "Connected Components Visualizer – DSAverse",
        description: "Run BFS or DFS from each unvisited node and watch every connected component get discovered and coloured in turn.",
        images: [{ url: "/og-image.png" }],
    },
    alternates: { canonical: "/graph-algorithms/connected-components" },
};
export default function Layout({ children }) { return children; }
