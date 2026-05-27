export const metadata = {
    title: "Rabin-Karp Rolling Hash – String Algorithms Visualizer",
    description: "Visualize Rabin-Karp's rolling hash: watch the hash window slide across the text, see hash collisions trigger verification, and understand average O(n+m) pattern matching.",
    keywords: ["Rabin-Karp", "rolling hash", "pattern matching", "string search", "hash collision", "algorithm visualization"],
    openGraph: { title: "Rabin-Karp Visualizer – DSAverse", images: [{ url: "/og-image.png" }] },
};
export default function Layout({ children }) { return children; }
