import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata = {
    title: 'Recursion | DSAverse',
    description: 'Learn the basics of recursion with visualizations.',
    icons: {
        icon: '/favicon.ico',
    },
    openGraph: {
        title: 'Recursion | DSAverse',
        description: 'Learn the basics of recursion with visualizations.',
        images: '/favicon.ico',
    },
    twitter: {
        title: 'Recursion | DSAverse',
        description: 'Learn the basics of recursion with visualizations.',
        images: '/favicon.ico',
    },
    keywords: ['DSA', 'Data Structures', 'Algorithms', 'Visualizations', 'Learn', 'Basics', 'Recursion'],
    robots: 'index, follow',
    creator: 'Archit Rathod',
    publisher: 'Archit Rathod',
    applicationName: 'DSAverse',
    authors: [{ name: 'Archit Rathod', url: 'https://archit-rathod.vercel.app/' }],
    category: 'technology',
}

export default function RecursionLayout({ children }) {
    return (
        <>
            <Navbar />
            <main>{children}</main>
            <Footer />
        </>
    )
}