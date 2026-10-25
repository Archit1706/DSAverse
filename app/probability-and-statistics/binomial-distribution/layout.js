import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Binomial Distribution Visualizer – A Galton Board That Fills Into C(n, k) pᵏ (1 − p)ⁿ⁻ᵏ',
    description: 'Drop balls through a Galton board: at every peg a ball goes right with probability p, and the bin it lands in counts its rights. Watch a seeded simulation fill into the binomial histogram, tilt the board with p, change the number of rows, and click a bin to see C(n, k) pᵏ (1 − p)ⁿ⁻ᵏ with live numbers.',
    keywords: ['binomial distribution', 'galton board', 'bean machine', 'binomial probability', 'n choose k', 'bernoulli trials', 'probability distribution', 'statistics'],
    openGraph: {
        title: 'Binomial Distribution: Galton Board – DSAverse',
        description: 'Each peg is a coin flip; each bin counts the rights. Drop a thousand balls and see the binomial formula appear.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/probability-and-statistics/binomial-distribution' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/probability-and-statistics/binomial-distribution" />
        </>
    );
}
