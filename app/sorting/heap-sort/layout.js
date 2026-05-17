export const metadata = {
    title: "Heap Sort Visualizer – Binary Heap Sort Animation",
    description: "Visualize Heap Sort building a max-heap then extracting elements one by one. O(n log n) guaranteed, O(1) space, in-place and unstable sort. Includes Python code example.",
    keywords: ["heap sort", "heapsort visualization", "binary heap", "max heap", "O(n log n)", "in-place sort", "heapify", "algorithm animation"],
    openGraph: {
        title: "Heap Sort Visualizer – DSAverse",
        description: "Interactive Heap Sort visualization with heap-building and extraction animations.",
        images: [{ url: "/og-image.png" }],
    },
};
export default function Layout({ children }) { return children; }
