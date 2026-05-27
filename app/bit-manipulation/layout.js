import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata = {
    title: {
        default: "Bit Manipulation Visualizer",
        template: "%s – Bit Manipulation | DSAverse",
    },
    description: "Interactive visualizations for bit manipulation algorithms: Single Number (XOR), Count Set Bits (Brian Kernighan), and Power of Two. Understand bitwise operations step by step.",
    keywords: ["bit manipulation", "XOR", "bitwise operations", "Brian Kernighan", "set bits", "power of two", "algorithm visualization"],
    openGraph: {
        title: "Bit Manipulation Visualizer – DSAverse",
        description: "Step-by-step interactive bit manipulation visualizations with binary representations.",
        images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    },
    authors: [{ name: "Archit Rathod", url: "https://archit-rathod.vercel.app/" }],
    creator: "Archit Rathod",
}

export default function BitManipulationLayout({ children }) {
    return (
        <>
            <Navbar />
            <main className="pt-16">{children}</main>
            <Footer />
        </>
    )
}
