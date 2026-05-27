export const metadata = {
    title: "Longest Increasing Subsequence – DP Visualizer",
    description: "Visualize the Longest Increasing Subsequence (LIS) algorithm with a 1D DP array. Watch how dp[i] values are computed by comparing each element with previous ones. O(n²) approach.",
    keywords: ["longest increasing subsequence", "LIS", "dynamic programming", "1D DP array", "subsequence", "patience sorting", "algorithm visualization"],
    openGraph: {
        title: "Longest Increasing Subsequence (LIS) Visualizer – DSAverse",
        description: "Interactive LIS DP visualization with element comparison animations and chain reconstruction.",
        images: [{ url: "/og-image.png" }],
    },
};
export default function Layout({ children }) { return children; }
