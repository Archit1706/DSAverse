export const metadata = {
    title: "Maximum Sum Subarray Visualizer – Fixed Sliding Window",
    description: "Visualize the Maximum Sum Subarray algorithm using a fixed-size sliding window of length k. Add the incoming element, remove the outgoing one, and update the maximum — all in O(n).",
    keywords: ["maximum sum subarray", "sliding window", "fixed window", "subarray", "algorithm visualization", "O(n)"],
    openGraph: {
        title: "Maximum Sum Subarray Visualizer – DSAverse",
        description: "Interactive Maximum Sum Subarray visualization with fixed sliding window animation.",
        images: [{ url: "/og-image.png" }],
    },
};
export default function Layout({ children }) { return children; }
