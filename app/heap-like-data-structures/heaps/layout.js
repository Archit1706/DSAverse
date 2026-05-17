export const metadata = {
    title: "Binary Heap Visualizer – Min/Max Heap Animation",
    description: "Visualize a Binary Heap (min-heap or max-heap): insert elements with heapify-up, extract root with heapify-down, and peek at the min/max. O(log n) insert and extract, O(1) peek.",
    keywords: ["binary heap", "min heap", "max heap", "heapify up", "heapify down", "extract min", "extract max", "priority queue", "data structure visualization"],
    openGraph: {
        title: "Binary Heap (Min/Max) Visualizer – DSAverse",
        description: "Interactive Binary Heap visualization with heapify-up and heapify-down animations.",
        images: [{ url: "/og-image.png" }],
    },
};
export default function Layout({ children }) { return children; }
