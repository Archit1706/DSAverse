export const metadata = {
    title: "Sudoku Solver Visualizer – Backtracking Grid",
    description: "Watch a Sudoku puzzle get solved step by step using recursive backtracking. See digits placed, constraints checked, and cells backtracked in real time on a live 9×9 grid.",
    keywords: ["sudoku solver", "backtracking", "constraint satisfaction", "recursion", "algorithm visualization", "sudoku backtracking"],
    openGraph: {
        title: "Sudoku Solver Visualizer – DSAverse",
        description: "Interactive 9×9 Sudoku solved live with backtracking — watch every placement and retreat.",
        images: [{ url: "/og-image.png" }],
    },
};
export default function Layout({ children }) { return children; }
