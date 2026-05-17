import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata = {
    title: {
        default: "Searching Algorithms Visualizer",
        template: "%s – Searching | DSAverse",
    },
    description: "Interactive visualizations for Binary Search, Linear Search, Jump Search, Interpolation Search, Exponential Search, Fibonacci Search, Ternary Search, and Block Search with code examples.",
    keywords: ["searching algorithms", "binary search", "linear search", "jump search", "interpolation search", "exponential search", "fibonacci search", "ternary search", "block search", "algorithm visualization"],
    openGraph: {
        title: "Searching Algorithms Visualizer – DSAverse",
        description: "Step-by-step interactive searching algorithm visualizations with complexity analysis.",
        images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    },
    twitter: {
        card: "summary_large_image",
        title: "Searching Algorithms Visualizer – DSAverse",
        description: "Interactive searching algorithm visualizations with step-by-step animations.",
        images: ["/og-image.png"],
    },
    authors: [{ name: "Archit Rathod", url: "https://archit-rathod.vercel.app/" }],
    creator: "Archit Rathod",
}

export default function SearchingLayout({ children }) {
    return (
        <>
            <Navbar />
            <main className="pt-16">{children}</main>
            <Footer />
        </>
    )
}
