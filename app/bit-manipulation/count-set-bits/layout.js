export const metadata = {
    title: "Count Set Bits (Brian Kernighan) – Bit Manipulation Visualizer",
    description: "Visualize Brian Kernighan's algorithm for counting set bits. Each iteration clears the lowest set bit with n & (n−1), running in O(set bits) — far fewer iterations than a naive O(32) approach.",
    keywords: ["count set bits", "Brian Kernighan", "popcount", "bit manipulation", "algorithm visualization"],
    openGraph: { title: "Count Set Bits Visualizer – DSAverse", images: [{ url: "/og-image.png" }] },
};
export default function Layout({ children }) { return children; }
