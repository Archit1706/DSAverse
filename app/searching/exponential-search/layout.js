export const metadata = {
    title: "Exponential Search Visualizer – Unbounded Array Search",
    description: "Visualize Exponential Search doubling the range to find bounds then applying Binary Search. O(log n) time, ideal for unbounded or infinite sorted arrays.",
    keywords: ["exponential search", "unbounded search", "O(log n)", "doubling technique", "sorted array", "algorithm visualization"],
    openGraph: {
        title: "Exponential Search Visualizer – DSAverse",
        description: "Interactive Exponential Search visualization with range-doubling animations.",
        images: [{ url: "/og-image.png" }],
    },
};
export default function Layout({ children }) { return children; }
