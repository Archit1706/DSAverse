import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Counting Principle Visualizer – Decision Trees and the Multiplication Rule',
    description: 'Watch a decision tree grow one stage at a time: 3 shirts, 2 pants and 2 shoes branch into 3 × 2 × 2 = 12 outfits. Add, remove and resize stages, click any leaf to read its outcome, and see the addition rule for either-or choices.',
    keywords: ['counting principle', 'multiplication rule', 'addition rule', 'rule of product', 'rule of sum', 'decision tree', 'fundamental counting principle', 'combinatorics'],
    openGraph: {
        title: 'Counting Principle: Decision Trees – DSAverse',
        description: 'Every stage multiplies the leaves. Grow the tree, reorder the stages, and see when choices add instead.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/combinatorics/counting-principle' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/combinatorics/counting-principle" />
        </>
    );
}
