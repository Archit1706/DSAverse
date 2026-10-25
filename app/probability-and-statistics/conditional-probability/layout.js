import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Conditional Probability Visualizer – Shrinking the Sample Space, P(A | B)',
    description: 'Knowing B happened shrinks the sample space to B. See it on the two-dice grid, then drag the splits of an area model — P(B), P(A | B) and P(A | Bᶜ) — and watch P(A ∩ B), P(A) and P(B | A) update with live numbers.',
    keywords: ['conditional probability', 'P(A given B)', 'area model', 'law of total probability', 'multiplication rule', 'dice probability', 'probability visualization'],
    openGraph: {
        title: 'Conditional Probability – DSAverse',
        description: 'Given B, only B is left. Shrink the dice grid, then drag an area model and see why P(A | B) is not P(B | A).',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/probability-and-statistics/conditional-probability' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/probability-and-statistics/conditional-probability" />
        </>
    );
}
