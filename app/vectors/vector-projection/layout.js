import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Vector Projection Visualizer – Onto a Line and a Plane',
    description: 'Project a vector onto a line in 2D by dropping a perpendicular, then onto a plane in 3D by removing its part along the normal. The leftover is always at right angles.',
    keywords: ['vector projection', 'orthogonal projection', 'projection onto a plane', 'scalar projection', 'dot product', 'orthogonal decomposition', 'vectors visualization'],
    openGraph: {
        title: 'Vector Projection – DSAverse',
        description: 'The closest point on a line or plane, and the perpendicular leftover.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/vectors/vector-projection' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/vectors/vector-projection" />
        </>
    );
}
