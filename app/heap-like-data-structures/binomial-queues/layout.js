export const metadata = {
    title: "Binomial Queue Visualizer – Binomial Heap Animation",
    description: "Visualize a Binomial Queue (Binomial Heap): a collection of Binomial Trees supporting O(log n) insert, union, and extract-min. See tree merging and cascading links animated.",
    keywords: ["binomial queue", "binomial heap", "binomial tree", "O(log n) merge", "priority queue", "heap union", "data structure visualization"],
    openGraph: {
        title: "Binomial Queue Visualizer – DSAverse",
        description: "Interactive Binomial Queue visualization with tree merging and cascading animations.",
        images: [{ url: "/og-image.png" }],
    },
};
export default function Layout({ children }) { return children; }
