export const metadata = {
    title: "Topological Sort (Kahn's Algorithm) Visualizer",
    description: "Visualize Kahn's algorithm for topological sorting: repeatedly remove nodes with in-degree zero and peel the DAG layer by layer. Step through in-degree counts, the ready queue, and the resulting order.",
    keywords: ["topological sort", "Kahn's algorithm", "in-degree", "DAG", "directed acyclic graph", "dependency resolution", "algorithm visualization"],
    openGraph: {
        title: "Topological Sort (Kahn's) Visualizer – DSAverse",
        description: "Peel a DAG layer by layer: repeatedly remove in-degree-zero nodes and watch the ready queue drive the ordering.",
        images: [{ url: "/og-image.png" }],
    },
    alternates: { canonical: "/graph-algorithms/topological-sort-indegree" },
};
export default function Layout({ children }) { return children; }
