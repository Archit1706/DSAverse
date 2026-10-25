import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Sample Spaces and Events Visualizer – Dice Grids, Coin Trees, Unions and Complements',
    description: 'All 36 outcomes of two dice on one grid and the 8 paths of three coins. Highlight events as sets of outcomes, take unions, intersections and complements, click outcomes to build your own event, and see P(A ∪ B) = P(A) + P(B) − P(A ∩ B) with live counts.',
    keywords: ['sample space', 'events', 'probability', 'two dice', 'coin flips', 'union', 'intersection', 'complement', 'equally likely outcomes', 'probability basics'],
    openGraph: {
        title: 'Sample Spaces and Events – DSAverse',
        description: 'Events are sets of outcomes. Highlight them on a dice grid and a coin tree, then combine them.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/probability-and-statistics/sample-spaces-and-events' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/probability-and-statistics/sample-spaces-and-events" />
        </>
    );
}
