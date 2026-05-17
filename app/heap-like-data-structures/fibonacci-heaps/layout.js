export const metadata = {
    title: "Fibonacci Heap Visualizer – Amortized O(1) Insert Animation",
    description: "Visualize a Fibonacci Heap with amortized O(1) insert and decrease-key, O(log n) extract-min. See lazy merging of trees and consolidation. The heap powering optimal Dijkstra's algorithm.",
    keywords: ["fibonacci heap", "amortized O(1)", "decrease key", "extract min", "Dijkstra heap", "lazy consolidation", "data structure visualization"],
    openGraph: {
        title: "Fibonacci Heap Visualizer – DSAverse",
        description: "Interactive Fibonacci Heap visualization with lazy merging and consolidation animations.",
        images: [{ url: "/og-image.png" }],
    },
};
export default function Layout({ children }) { return children; }
