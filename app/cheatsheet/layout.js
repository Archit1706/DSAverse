import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata = {
    title: 'Complexity Cheatsheet – Quick Reference',
    description:
        'Quick-reference guide for time and space complexities of all major sorting, searching, graph, and data structure algorithms. Filter by category, search by name, and compare complexities at a glance.',
    keywords: [
        'Big O notation', 'time complexity', 'space complexity', 'algorithm cheatsheet',
        'sorting complexity', 'searching complexity', 'graph algorithm complexity',
        'data structure operations', 'O(n log n)', 'O(1)', 'O(log n)',
    ],
    openGraph: {
        title: 'DSA Complexity Cheatsheet – DSAverse',
        description: 'Quick-reference complexity tables for sorting, searching, graphs, and data structures.',
        images: [{ url: '/og-image.png' }],
    },
};

export default function CheatsheetLayout({ children }) {
    return (
        <>
            <Navbar />
            <main>{children}</main>
            <Footer />
        </>
    );
}
