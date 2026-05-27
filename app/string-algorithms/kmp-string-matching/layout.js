export const metadata = {
    title: "KMP String Matching – String Algorithms Visualizer",
    description: "Visualize the Knuth-Morris-Pratt algorithm: watch the failure function build, then see how mismatches skip ahead without re-scanning already matched characters. O(n+m) time.",
    keywords: ["KMP", "Knuth-Morris-Pratt", "failure function", "pattern matching", "string search", "algorithm visualization"],
    openGraph: { title: "KMP String Matching Visualizer – DSAverse", images: [{ url: "/og-image.png" }] },
};
export default function Layout({ children }) { return children; }
