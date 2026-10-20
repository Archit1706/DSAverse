import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: "Kruskal's Minimum Spanning Tree Visualizer",
    description: "Visualize Kruskal's algorithm building a minimum spanning tree: sort edges by weight and greedily add each one unless it forms a cycle, tested with a union-find (disjoint set) structure.",
    keywords: ["kruskal's algorithm", "minimum spanning tree", "MST", "union-find", "disjoint set", "greedy", "cycle detection", "algorithm visualization"],
    openGraph: {
        title: "Kruskal's Minimum Spanning Tree – DSAverse",
        description: "Sort the edges by weight and greedily add each one unless union-find says it would close a cycle.",
        images: [{ url: "/og-image.png" }],
    },
    alternates: { canonical: "/graph-algorithms/kruskal-minimum-spanning-tree" },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/graph-algorithms/kruskal-minimum-spanning-tree" />
        </>
    );
}
