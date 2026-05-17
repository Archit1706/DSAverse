export const metadata = {
    title: "House Robber – Dynamic Programming Visualizer",
    description: "Visualize the House Robber DP problem: find the maximum sum without selecting adjacent houses. Watch the DP array fill with rob/skip decisions. Classic 1D DP with O(n) time, O(1) space.",
    keywords: ["house robber", "house robber DP", "dynamic programming", "adjacent constraint", "maximum subarray", "1D DP", "algorithm visualization"],
    openGraph: {
        title: "House Robber DP Visualizer – DSAverse",
        description: "Interactive House Robber DP visualization with rob/skip decision animations.",
        images: [{ url: "/og-image.png" }],
    },
};
export default function Layout({ children }) { return children; }
