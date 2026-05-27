export const metadata = {
    title: "Subsets (Power Set) Visualizer – Binary Decision Tree",
    description: "Visualize power set generation using recursive backtracking with a live binary decision tree. Watch each element get included or excluded step by step to build all 2^n subsets.",
    keywords: ["power set", "subset generation", "binary decision tree", "backtracking", "recursion", "combination", "algorithm visualization"],
    openGraph: {
        title: "Subsets / Power Set Visualizer – DSAverse",
        description: "Interactive binary decision tree showing how all 2^n subsets are generated through recursive include/exclude choices.",
        images: [{ url: "/og-image.png" }],
    },
};
export default function Layout({ children }) { return children; }
