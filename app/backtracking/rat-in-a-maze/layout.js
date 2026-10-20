import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: "Rat in a Maze – Backtracking Visualizer",
    description: "Visualize the Rat in a Maze backtracking algorithm. Watch the rat explore paths through a binary grid, mark visited cells, and backtrack from dead ends to find a route to the exit.",
    keywords: ["rat in a maze", "backtracking", "path finding", "maze solver", "algorithm visualization"],
    openGraph: { title: "Rat in a Maze Backtracking Visualizer – DSAverse", images: [{ url: "/og-image.png" }] },
    alternates: { canonical: "/backtracking/rat-in-a-maze" },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/backtracking/rat-in-a-maze" />
        </>
    );
}
