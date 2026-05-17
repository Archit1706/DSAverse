export const metadata = {
    title: "Radix Sort Visualizer – Digit-by-Digit Sort Animation",
    description: "Visualize Radix Sort processing elements digit by digit from least to most significant. O(d × (n + k)) time, non-comparison based stable sort. Efficient for integers and fixed-length strings.",
    keywords: ["radix sort", "radix sort visualization", "non-comparison sort", "LSD radix sort", "counting sort", "O(d×n)", "stable sort", "algorithm animation"],
    openGraph: {
        title: "Radix Sort Visualizer – DSAverse",
        description: "Interactive Radix Sort visualization with digit-by-digit bucket animations.",
        images: [{ url: "/og-image.png" }],
    },
};
export default function Layout({ children }) { return children; }
