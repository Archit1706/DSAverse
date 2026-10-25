import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Lines and Planes in 3D Visualizer – Intersections and Distance',
    description: 'Build a parametric line from a point and a direction and a plane from a normal, find where they meet — or why they never do — and measure a point\'s distance to a plane, all in an orbitable 3D scene.',
    keywords: ['parametric line', 'equation of a plane', 'normal vector', 'line plane intersection', 'distance point to plane', '3D geometry', 'vectors visualization'],
    openGraph: {
        title: 'Lines and Planes in 3D – DSAverse',
        description: 'A point and a direction, a point and a normal, where they meet and how far apart they are.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/vectors/lines-and-planes-in-3d' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/vectors/lines-and-planes-in-3d" />
        </>
    );
}
