import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata = {
    title: { template: '%s – Trees | DSAverse', default: 'Trees | DSAverse' },
    description: 'Interactive tree data structure visualizations — BST, AVL, traversals, segment tree, and trie.',
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
