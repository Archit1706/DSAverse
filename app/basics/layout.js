import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata = {
    title: 'Basics | DSAverse',
    description: 'Learn the basics of algorithms and data structures with visualizations.',
    icons: {
        icon: '/favicon.ico',
    },
    openGraph: {
        title: 'Basics | DSAverse',
        description: 'Learn the basics of algorithms and data structures with visualizations.',
        images: '/favicon.ico',
    },
    twitter: {
        title: 'Basics | DSAverse',
        description: 'Learn the basics of algorithms and data structures with visualizations.',
        images: '/favicon.ico',
    },
    keywords: ['DSA', 'Data Structures', 'Algorithms', 'Visualizations', 'Learn', 'Basics'],
    robots: 'index, follow',
    creator: 'Archit Rathod',
    publisher: 'Archit Rathod',
    applicationName: 'DSAverse',
    authors: [{ name: 'Archit Rathod', url: 'https://archit-rathod.vercel.app/' }],
    category: 'technology',
}

export default function BasicsLayout({ children }) {
    return (
        <>
            <Navbar />
            <main>{children}</main>
            <Footer />
        </>
    )
}