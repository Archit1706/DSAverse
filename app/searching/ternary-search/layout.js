export const metadata = {
    title: "Ternary Search Visualizer – Three-Way Divide Search Animation",
    description: "Visualize Ternary Search dividing the array into three parts using two midpoints. O(log₃ n) time on sorted arrays. Useful for unimodal functions and sorted data.",
    keywords: ["ternary search", "three-way search", "O(log3 n)", "unimodal function", "sorted array", "algorithm visualization"],
    openGraph: {
        title: "Ternary Search Visualizer – DSAverse",
        description: "Interactive Ternary Search visualization with three-way partition animations.",
        images: [{ url: "/og-image.png" }],
    },
};
export default function Layout({ children }) { return children; }
