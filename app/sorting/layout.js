import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata = {
    title: 'Sorting | DSAverse',
    description: 'Learn the basics of sorting with visualizations.',
    icons: {
        icon: '/favicon.ico',
    },
    openGraph: {
        title: 'Sorting | DSAverse',
        description: 'Learn the basics of sorting with visualizations.',
        images: '/favicon.ico',
    },
    twitter: {
        title: 'Sorting | DSAverse',
        description: 'Learn the basics of sorting with visualizations.',
        images: '/favicon.ico',
    },
    keywords: ['DSA', 'Data Structures', 'Algorithms', 'Visualizations', 'Learn', 'Basics', 'Sorting', 'Bubble Sort', 'Selection Sort', 'Insertion Sort', 'Merge Sort', 'Quick Sort', 'Heap Sort', 'Radix Sort', 'Counting Sort', 'Bucket Sort', 'Shell Sort', 'Sort', 'Sorting Algorithms'],
    robots: 'index, follow',
    creator: 'Archit Rathod',
    publisher: 'Archit Rathod',
    applicationName: 'DSAverse',
    authors: [{ name: 'Archit Rathod', url: 'https://archit-rathod.vercel.app/' }],
    category: 'technology',
}

export default function SortingLayout({ children }) {
    return (
        <>
            <Navbar />
            <main>{children}</main>
            <Footer />
        </>
    )
}