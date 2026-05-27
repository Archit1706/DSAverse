export const metadata = {
    title: "Power of Two – Bit Manipulation Visualizer",
    description: "Visualize the n & (n−1) == 0 trick for detecting powers of two. Powers of two have exactly one set bit — flipping it with (n−1) yields zero.",
    keywords: ["power of two", "bit manipulation", "n & n-1", "single set bit", "algorithm visualization"],
    openGraph: { title: "Power of Two Visualizer – DSAverse", images: [{ url: "/og-image.png" }] },
};
export default function Layout({ children }) { return children; }
