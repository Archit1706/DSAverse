import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata = {
    title: {
        default: "Dynamic Programming Visualizer",
        template: "%s – Dynamic Programming | DSAverse",
    },
    description: "Interactive visualizations for classic DP problems: Fibonacci Numbers, Making Change, Longest Common Subsequence, 0-1 Knapsack, and House Robber. Learn memoization and tabulation.",
    keywords: ["dynamic programming", "DP", "memoization", "tabulation", "fibonacci", "knapsack", "coin change", "LCS", "house robber", "overlapping subproblems", "optimal substructure", "algorithm visualization"],
    openGraph: {
        title: "Dynamic Programming Visualizer – DSAverse",
        description: "Step-by-step interactive DP visualizations with subproblem breakdowns.",
        images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    },
    twitter: {
        card: "summary_large_image",
        title: "Dynamic Programming Visualizer – DSAverse",
        description: "Interactive DP problem visualizations with memoization and tabulation animations.",
        images: ["/og-image.png"],
    },
    authors: [{ name: "Archit Rathod", url: "https://archit-rathod.vercel.app/" }],
    creator: "Archit Rathod",
}

export default function DynamicProgrammingLayout({ children }) {
    return (
        <>
            <Navbar />
            <main className="pt-16">{children}</main>
            <Footer />
        </>
    )
}
