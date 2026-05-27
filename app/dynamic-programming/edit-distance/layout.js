export const metadata = {
    title: "Edit Distance (Levenshtein) – DP Visualizer",
    description: "Visualize the Edit Distance (Levenshtein) algorithm with a 2D DP table. Watch how insertions, deletions, and substitutions are computed step by step. O(m×n) time and space.",
    keywords: ["edit distance", "levenshtein distance", "dynamic programming", "2D DP table", "string transformation", "spell checker", "algorithm visualization"],
    openGraph: {
        title: "Edit Distance Visualizer – DSAverse",
        description: "Interactive Levenshtein distance DP visualization with 2D table fill and backtracking animations.",
        images: [{ url: "/og-image.png" }],
    },
};
export default function Layout({ children }) { return children; }
