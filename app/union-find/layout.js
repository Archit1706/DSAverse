import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata = {
    title: { template: '%s – Union-Find | DSAverse', default: 'Union-Find | DSAverse' },
    description: 'Interactive Union-Find visualizations — Quick Find flat array, Quick Union tree pointers, path compression before/after, and union by rank with rank labels.',
    openGraph: {
        title: 'Union-Find Visualizers – DSAverse',
        description: 'Interactive disjoint-set visualizations: quick find, quick union, path compression, and union by rank.',
        images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
    alternates: { canonical: '/union-find' },
};

export default function UnionFindLayout({ children }) {
    return (
        <>
            <Navbar />
            <main className="pt-16">{children}</main>
            <Footer />
        </>
    );
}
