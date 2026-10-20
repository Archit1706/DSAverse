import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: "Prim's Minimum Spanning Tree Visualizer",
    description: "Visualize Prim's algorithm building a minimum spanning tree: grow the tree from a start node, always adding the cheapest edge that crosses to a new node. Step through the cut and watch the MST form.",
    keywords: ["prim's algorithm", "minimum spanning tree", "MST", "greedy", "weighted graph", "cut", "algorithm visualization"],
    openGraph: {
        title: "Prim's Minimum Spanning Tree – DSAverse",
        description: "Grow the tree from a start node, always taking the cheapest edge that crosses the cut to a node not yet reached.",
        images: [{ url: "/og-image.png" }],
    },
    alternates: { canonical: "/graph-algorithms/prims-minimum-spanning-tree" },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/graph-algorithms/prims-minimum-spanning-tree" />
        </>
    );
}
