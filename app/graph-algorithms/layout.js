import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata = {
    title: {
        default: "Graph Algorithms Visualizer",
        template: "%s – Graph Algorithms | DSAverse",
    },
    description: "Interactive step-by-step visualizations for graph algorithms including BFS, DFS, Dijkstra's Shortest Path, Prim's MST, Topological Sort, and more. Understand graph traversal with animated node and edge states.",
    keywords: ["graph algorithms", "BFS", "DFS", "breadth first search", "depth first search", "Dijkstra", "shortest path", "minimum spanning tree", "topological sort", "algorithm visualization", "graph traversal"],
    openGraph: {
        title: "Graph Algorithms Visualizer – DSAverse",
        description: "Step-by-step interactive graph algorithm visualizations with node state animations and complexity analysis.",
        images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    },
    twitter: {
        card: "summary_large_image",
        title: "Graph Algorithms Visualizer – DSAverse",
        description: "Interactive graph algorithm visualizations including BFS, DFS, and Dijkstra's shortest path.",
        images: ["/og-image.png"],
    },
    authors: [{ name: "Archit Rathod", url: "https://archit-rathod.vercel.app/" }],
    creator: "Archit Rathod",
}

export default function GraphAlgorithmsLayout({ children }) {
    return (
        <>
            <Navbar />
            <main className="pt-16">{children}</main>
            <Footer />
        </>
    )
}
