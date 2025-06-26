import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata = {
    title: 'Contact | DSAverse',
    description: 'Contact us for any questions or feedback.',
    icons: {
        icon: '/favicon.ico',
    },
    openGraph: {
        title: 'Contact | DSAverse',
        description: 'Contact us for any questions or feedback.',
        images: '/favicon.ico',
    },
    twitter: {
        title: 'Contact | DSAverse',
        description: 'Contact us for any questions or feedback.',
        images: '/favicon.ico',
    },
    keywords: ['DSA', 'Data Structures', 'Algorithms', 'Visualizations', 'Learn', 'Basics', 'Contact', 'Feedback', 'Questions', 'Contact Us', 'Feedback', 'Questions', 'Contact Us', 'Feedback', 'Questions'],
    robots: 'index, follow',
    creator: 'Archit Rathod',
    publisher: 'Archit Rathod',
    applicationName: 'DSAverse',
    authors: [{ name: 'Archit Rathod', url: 'https://archit-rathod.vercel.app/' }],
    category: 'technology',
}

export default function ContactLayout({ children }) {
    return (
        <>
            <Navbar />
            <main>{children}</main>
            <Footer />
        </>
    )
}