import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata = {
    title: {
        default: "Basic Data Structures Visualizer",
        template: "%s – Basics | DSAverse",
    },
    description: "Interactive visualizations of fundamental data structures: Stacks (array & linked list), Queues (array & linked list), and Lists. Learn push, pop, enqueue, dequeue step by step.",
    keywords: ["stack", "queue", "linked list", "array", "data structures", "push pop", "enqueue dequeue", "LIFO", "FIFO", "data structure visualization"],
    openGraph: {
        title: "Basic Data Structures Visualizer – DSAverse",
        description: "Interactive visualizations of stacks, queues, and lists with operation animations.",
        images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    },
    twitter: {
        card: "summary_large_image",
        title: "Basic Data Structures Visualizer – DSAverse",
        description: "Step-by-step interactive visualizations of stacks, queues, and lists.",
        images: ["/og-image.png"],
    },
    authors: [{ name: "Archit Rathod", url: "https://archit-rathod.vercel.app/" }],
    creator: "Archit Rathod",
}

export default function BasicsLayout({ children }) {
    return (
        <>
            <Navbar />
            <main className="pt-16">{children}</main>
            <Footer />
        </>
    )
}
