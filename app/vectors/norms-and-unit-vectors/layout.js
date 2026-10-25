import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Norms and Unit Vectors Visualizer – L1, L2 and L∞',
    description: 'Compare the taxicab, straight-line and largest-component norms, see their diamond, circle and square unit shapes, and normalise a vector to length 1 in each.',
    keywords: ['vector norm', 'L1 norm', 'L2 norm', 'infinity norm', 'unit vector', 'normalize vector', 'p-norm', 'unit circle'],
    openGraph: {
        title: 'Norms and Unit Vectors – DSAverse',
        description: 'Three ways to measure length, three unit "circles", and one way to make any vector length 1.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/vectors/norms-and-unit-vectors' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/vectors/norms-and-unit-vectors" />
        </>
    );
}
