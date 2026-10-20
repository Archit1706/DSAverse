import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: "Maze Solver Visualizer – Recursive Backtracking Animation",
    description: "Visualize a recursive maze-solving algorithm exploring paths and backtracking on dead ends. Watch the algorithm find its way through the maze step by step using DFS-based backtracking.",
    keywords: ["maze solver", "recursive maze", "backtracking", "depth-first search", "path finding", "algorithm visualization"],
    openGraph: {
        title: "Maze Solver Visualizer – DSAverse",
        description: "Interactive recursive maze solver with backtracking path animations.",
        images: [{ url: "/og-image.png" }],
    },
    alternates: { canonical: "/recursion/maze-solver" },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/recursion/maze-solver" />
        </>
    );
}
