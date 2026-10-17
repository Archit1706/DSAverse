export const metadata = {
    title: "Topological Sort (DFS) Visualizer – Graph Algorithms | DSAverse",
    description: "Visualize DFS-based topological sorting: run depth-first search on a DAG and push each node onto a stack when it finishes. Reversing the finish order yields a valid topological order.",
    keywords: ["topological sort", "DFS", "depth first search", "finish order", "DAG", "post-order", "algorithm visualization"],
    openGraph: {
        title: "Topological Sort (DFS) Visualizer – DSAverse",
        description: "Run depth-first search on a DAG, push each node as it finishes, and reverse that order for a valid topological sort.",
        images: [{ url: "/og-image.png" }],
    },
    alternates: { canonical: "/graph-algorithms/topological-sort-dfs" },
};
export default function Layout({ children }) { return children; }
