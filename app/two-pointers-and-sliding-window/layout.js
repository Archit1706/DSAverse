import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata = {
    title: {
        default: "Two Pointers & Sliding Window Visualizer",
        template: "%s – Two Pointers | DSAverse",
    },
    description: "Interactive visualizations for two pointers and sliding window patterns: Two Sum II, Valid Palindrome, Maximum Sum Subarray, and Longest Substring Without Repeating Characters.",
    keywords: ["two pointers", "sliding window", "two sum", "valid palindrome", "maximum sum subarray", "longest substring", "algorithm visualization"],
    openGraph: {
        title: "Two Pointers & Sliding Window Visualizer – DSAverse",
        description: "Step-by-step interactive two pointers and sliding window visualizations with complexity analysis.",
        images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    },
    twitter: {
        card: "summary_large_image",
        title: "Two Pointers & Sliding Window Visualizer – DSAverse",
        description: "Interactive two pointers and sliding window algorithm visualizations with step-by-step animations.",
        images: ["/og-image.png"],
    },
    authors: [{ name: "Archit Rathod", url: "https://archit-rathod.vercel.app/" }],
    creator: "Archit Rathod",
}

export default function TwoPointersLayout({ children }) {
    return (
        <>
            <Navbar />
            <main className="pt-16">{children}</main>
            <Footer />
        </>
    )
}
