import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Vector Addition and Scaling Visualizer – Tip to Tail',
    description: 'Add vectors tip to tail and see the parallelogram rule, stretch and flip them with positive and negative scalars, and subtract by adding the opposite — every rule drawn and computed live.',
    keywords: ['vector addition', 'scalar multiplication', 'parallelogram rule', 'tip to tail', 'vector subtraction', 'linear combination', 'vectors visualization'],
    openGraph: {
        title: 'Vector Addition and Scaling – DSAverse',
        description: 'Tip to tail, the parallelogram rule, and scalars that stretch, shrink and flip.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/vectors/vector-addition-and-scaling' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/vectors/vector-addition-and-scaling" />
        </>
    );
}
