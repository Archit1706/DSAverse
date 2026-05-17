export const metadata = {
    title: "Block Search Visualizer – Block-Based Search Animation",
    description: "Visualize Block Search (also known as Jump Search) dividing sorted arrays into fixed-size blocks. O(√n) time complexity, balancing the cost of jumping and linear scanning.",
    keywords: ["block search", "jump search", "O(√n)", "sorted array", "block traversal", "algorithm visualization"],
    openGraph: {
        title: "Block Search Visualizer – DSAverse",
        description: "Interactive Block Search visualization with block-division and scan animations.",
        images: [{ url: "/og-image.png" }],
    },
};
export default function Layout({ children }) { return children; }
