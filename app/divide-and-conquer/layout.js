import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata = {
    title: { template: '%s – Divide & Conquer | DSAverse', default: 'Divide & Conquer | DSAverse' },
    description: 'Interactive Divide & Conquer visualizations — merge sort recursion tree, binary search decision tree, Strassen\'s matrix multiplication, and closest pair of points.',
    openGraph: {
        title: 'Divide & Conquer Visualizer – DSAverse',
        description: 'Interactive divide and conquer visualizations: recursion trees, decision trees, Strassen\'s algorithm, and closest pair of points.',
        images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
    alternates: { canonical: '/divide-and-conquer' },
};

export default function DivideAndConquerLayout({ children }) {
    return (
        <>
            <Navbar />
            <main className="pt-16">{children}</main>
            <Footer />
        </>
    );
}
