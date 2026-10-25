import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Cross Product Visualizer – 3D Right-Hand Rule',
    description: 'Orbit a 3D scene where a × b stands perpendicular to both vectors, its length equal to the area of the parallelogram they span. See the right-hand rule and how swapping the order flips it.',
    keywords: ['cross product', 'vector product', 'right hand rule', 'cross product 3D', 'parallelogram area', 'normal vector', 'vectors visualization'],
    openGraph: {
        title: 'Cross Product in 3D – DSAverse',
        description: 'Perpendicular to both, as long as the parallelogram is large, and flipped when you swap the order.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/vectors/cross-product' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/vectors/cross-product" />
        </>
    );
}
