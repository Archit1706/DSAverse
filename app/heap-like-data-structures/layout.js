import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata = {
    title: 'Heap-like Data Structures | DSAverse',
    description: 'Explore heap-like data structures including binary heaps, binomial queues, fibonacci heaps, leftist heaps, and skew heaps with interactive visualizations.',
    icons: {
        icon: '/favicon.ico',
    },
    openGraph: {
        title: 'Heap-like Data Structures | DSAverse',
        description: 'Master priority queue implementations with efficient merge, insert, and extract operations through interactive visualizations.',
        images: '/favicon.ico',
    },
    twitter: {
        title: 'Heap-like Data Structures | DSAverse',
        description: 'Master priority queue implementations with efficient merge, insert, and extract operations through interactive visualizations.',
        images: '/favicon.ico',
    },
    keywords: [
        'DSA',
        'Data Structures',
        'Heap',
        'Binary Heap',
        'Binomial Queue',
        'Fibonacci Heap',
        'Leftist Heap',
        'Skew Heap',
        'Priority Queue',
        'Visualizations',
        'Learn',
        'Algorithms',
        'Merge',
        'Extract Min',
        'Max Heap',
        'Min Heap'
    ],
    robots: 'index, follow',
    creator: 'Archit Rathod',
    publisher: 'Archit Rathod',
    applicationName: 'DSAverse',
    authors: [{ name: 'Archit Rathod', url: 'https://archit-rathod.vercel.app/' }],
    category: 'technology',
}

export default function HeapLikeDataStructuresLayout({ children }) {
    return (
        <>
            <Navbar />
            <main>{children}</main>
            <Footer />
        </>
    )
}