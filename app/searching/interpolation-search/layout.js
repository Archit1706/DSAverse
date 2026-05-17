export const metadata = {
    title: "Interpolation Search Visualizer – Probe Position Animation",
    description: "Visualize Interpolation Search estimating the probe position using value distribution. O(log log n) average on uniformly distributed sorted arrays. Smarter than binary search for numerical data.",
    keywords: ["interpolation search", "probe position", "O(log log n)", "uniformly distributed", "numerical search", "algorithm visualization"],
    openGraph: {
        title: "Interpolation Search Visualizer – DSAverse",
        description: "Interactive Interpolation Search visualization with probe-position estimation.",
        images: [{ url: "/og-image.png" }],
    },
};
export default function Layout({ children }) { return children; }
