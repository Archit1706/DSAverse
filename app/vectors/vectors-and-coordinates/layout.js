import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Vectors and Coordinates Visualizer – Arrows Are Numbers',
    description: 'Drag an arrow and watch its components change, or type the components and watch the arrow move. See why tip minus tail gives the vector wherever it is drawn, and get its length from Pythagoras.',
    keywords: ['vectors', 'vector components', 'vector magnitude', 'vector length', 'pythagoras', 'tip minus tail', 'position vector', 'vectors visualization'],
    openGraph: {
        title: 'Vectors and Coordinates – DSAverse',
        description: 'An arrow and a pair of numbers are the same thing. Drag one and watch the other follow.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/vectors/vectors-and-coordinates' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/vectors/vectors-and-coordinates" />
        </>
    );
}
