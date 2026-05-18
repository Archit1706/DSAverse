import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata = {
    title: 'Contact – Get In Touch',
    description:
        'Send feedback, report bugs, request features, or inquire about collaborating on DSAverse. We read every message and respond within 24–48 hours.',
    keywords: ['contact DSAverse', 'feedback', 'bug report', 'feature request', 'open source contribution', 'DSA visualizer'],
    openGraph: {
        title: 'Contact DSAverse',
        description: 'Send feedback, report bugs, or collaborate with us on DSAverse.',
        images: [{ url: '/og-image.png' }],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Contact DSAverse',
        description: 'Send feedback, report bugs, or collaborate with us on DSAverse.',
        images: ['/og-image.png'],
    },
    authors: [{ name: 'Archit Rathod', url: 'https://archit-rathod.vercel.app/' }],
    creator: 'Archit Rathod',
};

export default function ContactLayout({ children }) {
    return (
        <>
            <Navbar />
            <main className="pt-16">{children}</main>
            <Footer />
        </>
    );
}
