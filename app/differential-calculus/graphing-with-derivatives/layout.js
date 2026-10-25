import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Graphing with Derivatives – f, f′ and f″ Stacked',
    description: 'f, its slope f′ and its curvature f″ stacked on one x-axis. Predict whether f rises or falls and which way it bends from the signs of f′ and f″, and see every local maximum, minimum and inflection point line up across the three plots.',
    keywords: ['graphing with derivatives', 'curve sketching', 'first derivative test', 'second derivative test', 'concavity', 'inflection point', 'critical points', 'local maximum', 'local minimum', 'calculus visualization'],
    openGraph: {
        title: 'Graphing with Derivatives – DSAverse',
        description: 'Read a curve\'s shape from its derivatives: rising, falling, bending up, bending down — peaks, valleys and inflection points tied across f, f′ and f″.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/differential-calculus/graphing-with-derivatives' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/differential-calculus/graphing-with-derivatives" />
        </>
    );
}
