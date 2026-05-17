import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata = {
    title: {
        default: "Heap-like Data Structures Visualizer",
        template: "%s – Heaps | DSAverse",
    },
    description: "Explore heap-like data structures: Binary Heaps (min/max), Binomial Queues, Fibonacci Heaps, Leftist Heaps, and Skew Heaps. Visualize insert, extract, and merge operations step by step.",
    keywords: ["binary heap", "min heap", "max heap", "fibonacci heap", "binomial queue", "leftist heap", "skew heap", "priority queue", "heapify", "extract min", "extract max", "data structure visualization"],
    openGraph: {
        title: "Heap Data Structures Visualizer – DSAverse",
        description: "Interactive animations for binary heaps, fibonacci heaps, and other heap variants.",
        images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    },
    twitter: {
        card: "summary_large_image",
        title: "Heap Data Structures Visualizer – DSAverse",
        description: "Interactive heap data structure visualizations with operation animations.",
        images: ["/og-image.png"],
    },
    authors: [{ name: "Archit Rathod", url: "https://archit-rathod.vercel.app/" }],
    creator: "Archit Rathod",
}

export default function HeapLikeDataStructuresLayout({ children }) {
    return (
        <>
            <Navbar />
            <main className="pt-16">{children}</main>
            <Footer />
        </>
    )
}
