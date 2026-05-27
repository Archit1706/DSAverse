import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata = {
    title: {
        default: "Backtracking Visualizer",
        template: "%s – Backtracking | DSAverse",
    },
    description: "Interactive visualizations for backtracking algorithms: N-Queens, Word Search, and Rat in a Maze. Watch the algorithm explore and prune the search space in real time.",
    keywords: ["backtracking", "N-Queens", "word search", "rat in a maze", "constraint satisfaction", "pruning", "algorithm visualization"],
    openGraph: {
        title: "Backtracking Visualizer – DSAverse",
        description: "Step-by-step interactive backtracking visualizations with search space exploration and pruning.",
        images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    },
    authors: [{ name: "Archit Rathod", url: "https://archit-rathod.vercel.app/" }],
    creator: "Archit Rathod",
}

export default function BacktrackingLayout({ children }) {
    return (
        <>
            <Navbar />
            <main className="pt-16">{children}</main>
            <Footer />
        </>
    )
}
