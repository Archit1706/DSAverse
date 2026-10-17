export const metadata = {
    title: "Maximum Subarray (Kadane's Algorithm) Visualizer",
    description: "Visualize Kadane's algorithm finding the contiguous subarray with the largest sum in O(n) time. Watch the running sum decide at every element whether to extend the current subarray or restart from it.",
    keywords: ["maximum subarray", "Kadane's algorithm", "largest sum subarray", "dynamic programming", "O(n)", "running sum", "algorithm visualization"],
    openGraph: {
        title: "Maximum Subarray (Kadane's) Visualizer – DSAverse",
        description: "Watch the running sum decide at each element whether to extend the current subarray or restart, finding the largest sum in one pass.",
        images: [{ url: "/og-image.png" }],
    },
    alternates: { canonical: "/dynamic-programming/maximum-subarray" },
};
export default function Layout({ children }) { return children; }
