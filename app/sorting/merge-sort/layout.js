export const metadata = {
    title: "Merge Sort Visualizer – Divide & Conquer Animation",
    description: "Visualize Merge Sort recursively splitting an array in half then merging sorted halves. O(n log n) time, O(n) space, stable sort. The classic divide-and-conquer sorting algorithm.",
    keywords: ["merge sort", "merge sort visualization", "divide and conquer", "O(n log n)", "stable sort", "recursive sort", "algorithm animation"],
    openGraph: {
        title: "Merge Sort Visualizer – DSAverse",
        description: "Interactive Merge Sort visualization with divide-and-conquer step animations.",
        images: [{ url: "/og-image.png" }],
    },
};
export default function Layout({ children }) { return children; }
