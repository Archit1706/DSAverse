export const metadata = {
    title: "Bucket Sort Visualizer – Distribution Sort Animation",
    description: "Visualize Bucket Sort distributing elements into buckets and sorting each individually. O(n + k) average time, suitable for uniformly distributed floating-point numbers.",
    keywords: ["bucket sort", "bucket sort visualization", "distribution sort", "O(n+k)", "scatter-gather", "stable sort", "algorithm animation"],
    openGraph: {
        title: "Bucket Sort Visualizer – DSAverse",
        description: "Interactive Bucket Sort visualization showing distribution and bucket sorting.",
        images: [{ url: "/og-image.png" }],
    },
};
export default function Layout({ children }) { return children; }
