export const metadata = {
    title: "Skew Heap Visualizer – Self-Adjusting Heap Animation",
    description: "Visualize a Skew Heap: a self-adjusting leftist heap that always swaps children during merge. Amortized O(log n) operations without maintaining null-path-length. Simple and cache-friendly.",
    keywords: ["skew heap", "self-adjusting heap", "amortized O(log n)", "heap merge", "swap children", "data structure visualization"],
    openGraph: {
        title: "Skew Heap Visualizer – DSAverse",
        description: "Interactive Skew Heap visualization with self-adjusting merge animations.",
        images: [{ url: "/og-image.png" }],
    },
};
export default function Layout({ children }) { return children; }
