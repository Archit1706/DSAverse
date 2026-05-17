export const metadata = {
    title: "Leftist Heap Visualizer – Left-Biased Merge Animation",
    description: "Visualize a Leftist Heap maintaining the leftist property (null path length) for efficient O(log n) merge. Useful when frequent heap merges are required. See null-path-length rebalancing.",
    keywords: ["leftist heap", "leftist tree", "null path length", "O(log n) merge", "heap merge", "data structure visualization"],
    openGraph: {
        title: "Leftist Heap Visualizer – DSAverse",
        description: "Interactive Leftist Heap visualization with merge and null-path-length animations.",
        images: [{ url: "/og-image.png" }],
    },
};
export default function Layout({ children }) { return children; }
