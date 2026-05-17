export const metadata = {
    title: "String Reversal Recursion Visualizer – Recursive Stack Animation",
    description: "Visualize reversing a string recursively: reverse(s) = reverse(s[1:]) + s[0]. Watch how characters are peeled off and reassembled during the unwinding phase of recursion.",
    keywords: ["string reversal recursion", "recursive string reverse", "call stack", "string manipulation", "algorithm visualization"],
    openGraph: {
        title: "String Reversal Recursion Visualizer – DSAverse",
        description: "Interactive recursive string reversal visualization with stack unwinding.",
        images: [{ url: "/og-image.png" }],
    },
};
export default function Layout({ children }) { return children; }
