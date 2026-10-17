import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata = {
    title: { template: '%s – Indexing | DSAverse', default: 'Indexing | DSAverse' },
    description: 'Interactive visualizations for the structures that make lookups fast — hash tables with separate chaining and open addressing, B-trees, and B+ trees.',
    keywords: ['indexing', 'hash table', 'separate chaining', 'open addressing', 'linear probing', 'B-tree', 'B+ tree', 'database index', 'data structure visualization'],
    openGraph: {
        title: 'Indexing Visualizers – DSAverse',
        description: 'Watch hash tables resolve collisions and B-trees split nodes — the structures behind every fast lookup.',
        images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
    alternates: { canonical: '/indexing' },
};

export default function IndexingLayout({ children }) {
    return (
        <>
            <Navbar />
            <main className="pt-16">{children}</main>
            <Footer />
        </>
    );
}
