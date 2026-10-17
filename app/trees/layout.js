import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata = {
    title: { template: '%s – Trees | DSAverse', default: 'Trees | DSAverse' },
    description: 'Interactive tree data structure visualizations — BST, AVL, traversals, segment tree, and trie.',
    openGraph: {
        title: 'Tree Data Structure Visualizers – DSAverse',
        description: 'Interactive tree visualizations: binary search trees, AVL rotations, traversals, segment trees, and tries.',
        images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
    alternates: { canonical: '/trees' },
};

export default function TreesLayout({ children }) {
    return (
        <>
            <Navbar />
            <main className="pt-16">{children}</main>
            <Footer />
        </>
    );
}
