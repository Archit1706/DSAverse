import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata = {
    title: {
        default: "Recursion Algorithms Visualizer",
        template: "%s – Recursion | DSAverse",
    },
    description: "Interactive visualizations of recursive algorithms: Factorial, Fibonacci Sequence, Tower of Hanoi, N-Queens, Maze Solver, and String Reversal. Understand call stacks and base cases.",
    keywords: ["recursion", "recursive algorithms", "call stack", "tower of hanoi", "n-queens", "fibonacci", "maze solver", "string reversal", "factorial", "algorithm visualization"],
    openGraph: {
        title: "Recursion Algorithms Visualizer – DSAverse",
        description: "Step-by-step interactive recursion visualizations with call stack animations.",
        images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    },
    twitter: {
        card: "summary_large_image",
        title: "Recursion Algorithms Visualizer – DSAverse",
        description: "Interactive recursion visualizations with call stack animations.",
        images: ["/og-image.png"],
    },
    authors: [{ name: "Archit Rathod", url: "https://archit-rathod.vercel.app/" }],
    creator: "Archit Rathod",
}

export default function RecursionLayout({ children }) {
    return (
        <>
            <Navbar />
            <main>{children}</main>
            <Footer />
        </>
    )
}
