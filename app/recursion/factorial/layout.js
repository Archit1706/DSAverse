export const metadata = {
    title: "Factorial Recursion Visualizer – Recursive Call Stack Animation",
    description: "Visualize how factorial(n) = n × factorial(n-1) unwinds through recursive calls. Watch the call stack build up and resolve. The canonical introduction to recursion and base cases.",
    keywords: ["factorial recursion", "recursive factorial", "call stack", "base case", "n factorial", "algorithm visualization"],
    openGraph: {
        title: "Factorial Recursion Visualizer – DSAverse",
        description: "Interactive factorial recursion visualization with call stack animations.",
        images: [{ url: "/og-image.png" }],
    },
};
export default function Layout({ children }) { return children; }
