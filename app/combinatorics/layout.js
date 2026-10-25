import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata = {
    title: { template: '%s – Combinatorics | DSAverse', default: 'Combinatorics | DSAverse' },
    description: 'Interactive combinatorics: grow decision trees for the counting principle, fill slots for permutations, group orderings into combinations, build Pascal\'s triangle, expand (a + b)ⁿ as a cube, and see stars and bars, inclusion-exclusion and the pigeonhole principle at work.',
    keywords: ['combinatorics', 'counting principle', 'permutations', 'combinations', 'nCr', 'pascals triangle', 'binomial theorem', 'stars and bars', 'inclusion exclusion', 'pigeonhole principle', 'combinatorics visualization'],
    openGraph: {
        title: 'Combinatorics Visualizers – DSAverse',
        description: 'Count without listing: decision trees, slot filling, Pascal\'s triangle, stars and bars, Venn regions and pigeonholes you can drag and click.',
        images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
    alternates: { canonical: '/combinatorics' },
};

export default function CombinatoricsLayout({ children }) {
    return (
        <>
            <Navbar />
            <main className="pt-16">{children}</main>
            <Footer />
        </>
    );
}
