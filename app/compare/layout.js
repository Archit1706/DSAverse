import { totalPages } from '@/data/learningStats';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata = {
    title: 'Compare Algorithms Side by Side',
    description: `Put any two or three algorithms side by side and compare their time complexity, space complexity, difficulty and approach. Covers all ${totalPages} visualizers on DSAverse, from sorting and graphs to hash tables and B-trees.`,
    keywords: ['compare algorithms', 'algorithm comparison', 'time complexity comparison', 'quick sort vs merge sort', 'BFS vs DFS', 'data structure comparison', 'big-O comparison'],
    openGraph: {
        title: 'Compare Algorithms – DSAverse',
        description: 'Put any two or three algorithms side by side and compare complexity, difficulty and approach.',
        images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
    alternates: { canonical: '/compare' },
};

export default function CompareLayout({ children }) {
    return (
        <>
            <Navbar />
            <main className="pt-16">{children}</main>
            <Footer />
        </>
    );
}
