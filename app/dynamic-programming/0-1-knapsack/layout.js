export const metadata = {
    title: "0-1 Knapsack – Dynamic Programming Visualizer",
    description: "Visualize the 0-1 Knapsack problem: select items to maximize value within a weight limit. Watch the DP table build with include/exclude decisions. O(n×W) time and space.",
    keywords: ["0-1 knapsack", "knapsack problem", "dynamic programming", "include exclude", "weight capacity", "value optimization", "algorithm visualization"],
    openGraph: {
        title: "0-1 Knapsack DP Visualizer – DSAverse",
        description: "Interactive 0-1 Knapsack DP visualization with include/exclude decision table.",
        images: [{ url: "/og-image.png" }],
    },
};
export default function Layout({ children }) { return children; }
