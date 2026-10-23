import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata = {
    title: { template: '%s – Database Systems | DSAverse', default: 'Database Systems | DSAverse' },
    description: 'Interactive visualizations of how databases keep data correct and fast — isolation levels, serializability, two-phase locking, MVCC, write-ahead logging, normalization, join algorithms, relational algebra and LSM trees.',
    keywords: ['database systems', 'transaction isolation', 'serializability', 'two-phase locking', 'MVCC', 'write-ahead logging', 'normalization', 'join algorithms', 'relational algebra', 'LSM tree', 'DBMS visualization'],
    openGraph: {
        title: 'Database Systems Visualizers – DSAverse',
        description: 'Watch transactions interleave, locks queue up, logs replay after a crash and tables split into normal form.',
        images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
    alternates: { canonical: '/database-systems' },
};

export default function DatabaseSystemsLayout({ children }) {
    return (
        <>
            <Navbar />
            <main className="pt-16">{children}</main>
            <Footer />
        </>
    );
}
