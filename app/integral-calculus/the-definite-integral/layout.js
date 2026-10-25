import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Definite Integral Visualizer – Signed Area as a Limit',
    description: 'See the definite integral as the limit of Riemann sums and as a signed area: pieces above the x-axis count positive, pieces below count negative. Drag the limits of integration — even past each other — and watch additivity and reversal at work.',
    keywords: ['definite integral', 'signed area', 'integral as a limit', 'riemann sums limit', 'area under a curve', 'reversing limits of integration', 'properties of integrals', 'calculus visualization'],
    openGraph: {
        title: 'The Definite Integral: Signed Area – DSAverse',
        description: 'Rectangles that hang below the axis count negative. Their limit is the definite integral.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/integral-calculus/the-definite-integral' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/integral-calculus/the-definite-integral" />
        </>
    );
}
