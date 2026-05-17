export const metadata = {
    title: "Fibonacci Sequence Recursion Visualizer – Recursive Tree Animation",
    description: "Visualize Fibonacci's recursive tree: fib(n) = fib(n-1) + fib(n-2). See overlapping subproblems and exponential call explosion — the perfect intro to why memoization matters.",
    keywords: ["fibonacci recursion", "recursive fibonacci", "recursion tree", "overlapping subproblems", "exponential time", "algorithm visualization"],
    openGraph: {
        title: "Fibonacci Recursion Visualizer – DSAverse",
        description: "Interactive Fibonacci recursion tree visualization showing overlapping subproblems.",
        images: [{ url: "/og-image.png" }],
    },
};
export default function Layout({ children }) { return children; }
