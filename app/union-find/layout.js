import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata = {
    title: { template: '%s – Union-Find | DSAverse', default: 'Union-Find | DSAverse' },
    description: 'Interactive Union-Find visualizations — Quick Find flat array, Quick Union tree pointers, path compression before/after, and union by rank with rank labels.',
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
