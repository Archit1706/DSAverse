import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata = {
    title: 'Searching | DSAverse',
    description: 'Learn the basics of searching with visualizations.',
    icons: {
        icon: '/favicon.ico',
    },
    openGraph: {
        title: 'Searching | DSAverse',
        description: 'Learn the basics of searching with visualizations.',
        images: '/favicon.ico',
    },
    twitter: {
        title: 'Searching | DSAverse',
        description: 'Learn the basics of searching with visualizations.',
        images: '/favicon.ico',
    },
    keywords: ['DSA', 'Data Structures', 'Algorithms', 'Visualizations', 'Learn', 'Basics', 'Searching', 'Linear Search', 'Binary Search', 'Ternary Search', 'Jump Search', 'Interpolation Search', 'Exponential Search', 'Fibonacci Search', 'Block Search', 'Search', 'Search Algorithms'],
    robots: 'index, follow',
    creator: 'Archit Rathod',
    publisher: 'Archit Rathod',
    applicationName: 'DSAverse',
    authors: [{ name: 'Archit Rathod', url: 'https://archit-rathod.vercel.app/' }],
    category: 'technology',
}

export default function SearchingLayout({ children }) {
    return (
        <>
            <Navbar />
            <main>{children}</main>
            <Footer />
        </>
    )
}