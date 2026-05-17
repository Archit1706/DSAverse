export const metadata = {
    title: "Quick Sort Visualizer – Pivot & Partition Animation",
    description: "Visualize Quick Sort choosing a pivot and partitioning elements around it. O(n log n) average, O(n²) worst case. Efficient in-place sorting algorithm used in production systems.",
    keywords: ["quick sort", "quicksort visualization", "pivot element", "partition", "O(n log n)", "divide and conquer", "in-place sort", "algorithm animation"],
    openGraph: {
        title: "Quick Sort Visualizer – DSAverse",
        description: "Interactive Quick Sort visualization with pivot and partition step animations.",
        images: [{ url: "/og-image.png" }],
    },
};
export default function Layout({ children }) { return children; }
