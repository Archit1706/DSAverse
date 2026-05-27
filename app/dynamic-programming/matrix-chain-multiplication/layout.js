export const metadata = {
    title: "Matrix Chain Multiplication – DP Visualizer",
    description: "Visualize the Matrix Chain Multiplication algorithm. Watch the DP table fill diagonally as the algorithm finds the optimal parenthesization to minimize scalar multiplications. O(n³) time.",
    keywords: ["matrix chain multiplication", "MCM", "dynamic programming", "optimal parenthesization", "interval DP", "algorithm visualization"],
    openGraph: {
        title: "Matrix Chain Multiplication Visualizer – DSAverse",
        description: "Interactive MCM DP visualization with diagonal table fill and optimal bracket grouping.",
        images: [{ url: "/og-image.png" }],
    },
};
export default function Layout({ children }) { return children; }
