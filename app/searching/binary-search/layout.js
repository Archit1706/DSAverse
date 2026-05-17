export const metadata = {
    title: "Binary Search Visualizer – O(log n) Search Animation",
    description: "Visualize Binary Search halving the search range on each step. O(log n) time on sorted arrays. The fastest comparison-based search algorithm — essential for coding interviews.",
    keywords: ["binary search", "binary search visualization", "O(log n)", "sorted array", "divide and conquer search", "algorithm animation"],
    openGraph: {
        title: "Binary Search Visualizer – DSAverse",
        description: "Interactive Binary Search visualization with log(n) step animations.",
        images: [{ url: "/og-image.png" }],
    },
};
export default function Layout({ children }) { return children; }
