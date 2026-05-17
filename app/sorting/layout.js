import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata = {
    title: {
        default: "Sorting Algorithms Visualizer",
        template: "%s – Sorting | DSAverse",
    },
    description: "Interactive step-by-step visualizations for Bubble Sort, Selection Sort, Insertion Sort, Merge Sort, Quick Sort, Heap Sort, Radix Sort, and Bucket Sort. Compare complexities and see code examples.",
    keywords: ["sorting algorithms", "bubble sort", "merge sort", "quick sort", "heap sort", "insertion sort", "selection sort", "radix sort", "bucket sort", "time complexity", "algorithm visualization"],
    openGraph: {
        title: "Sorting Algorithms Visualizer – DSAverse",
        description: "Step-by-step interactive sorting algorithm visualizations with complexity analysis.",
        images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    },
    twitter: {
        card: "summary_large_image",
        title: "Sorting Algorithms Visualizer – DSAverse",
        description: "Interactive sorting algorithm visualizations with step-by-step animations.",
        images: ["/og-image.png"],
    },
    authors: [{ name: "Archit Rathod", url: "https://archit-rathod.vercel.app/" }],
    creator: "Archit Rathod",
}

export default function SortingLayout({ children }) {
    return (
        <>
            <Navbar />
            <main className="pt-16">{children}</main>
            <Footer />
        </>
    )
}
