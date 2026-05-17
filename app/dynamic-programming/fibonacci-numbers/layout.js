export const metadata = {
    title: "Fibonacci Numbers – Dynamic Programming Visualizer",
    description: "Visualize computing Fibonacci numbers using bottom-up dynamic programming (tabulation). See how DP avoids redundant calculations with O(n) time and O(n) space vs O(2ⁿ) naive recursion.",
    keywords: ["fibonacci DP", "dynamic programming fibonacci", "tabulation", "memoization", "O(n) fibonacci", "algorithm visualization"],
    openGraph: {
        title: "Fibonacci DP Visualizer – DSAverse",
        description: "Interactive Fibonacci DP visualization showing tabulation and subproblem reuse.",
        images: [{ url: "/og-image.png" }],
    },
};
export default function Layout({ children }) { return children; }
