import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Combinations Visualizer – Why nCr = nPr / k!',
    description: 'List all 60 ordered picks of 3 letters from 5, then watch the 6 orderings of each set gather into one row and collapse to a single team: C(5, 3) = 60 / 3! = 10. Pick your own set, switch views, and see the n! / (k! (n − k)!) formula with live numbers.',
    keywords: ['combinations', 'nCr', 'n choose k', 'binomial coefficient', 'combination formula', 'permutations vs combinations', 'unordered selection', 'combinatorics'],
    openGraph: {
        title: 'Combinations: Why nCr = nPr / k! – DSAverse',
        description: 'Every set of k items shows up k! times among the ordered picks. Group them and count the groups.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/combinatorics/combinations' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/combinatorics/combinations" />
        </>
    );
}
