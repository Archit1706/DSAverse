import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata = {
    title: {
        default: "String Algorithms Visualizer",
        template: "%s – String Algorithms | DSAverse",
    },
    description: "Interactive visualizations for string algorithms: KMP String Matching, Rabin-Karp rolling hash, and Z-Algorithm. Understand pattern matching step by step.",
    keywords: ["string algorithms", "KMP", "Knuth-Morris-Pratt", "Rabin-Karp", "Z-algorithm", "pattern matching", "string search", "algorithm visualization"],
    openGraph: {
        title: "String Algorithms Visualizer – DSAverse",
        description: "Step-by-step interactive string algorithm visualizations with failure function and rolling hash animations.",
        images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    },
    authors: [{ name: "Archit Rathod", url: "https://archit-rathod.vercel.app/" }],
    creator: "Archit Rathod",
}

export default function StringAlgorithmsLayout({ children }) {
    return (
        <>
            <Navbar />
            <main className="pt-16">{children}</main>
            <Footer />
        </>
    )
}
