import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Dot Product Visualizer – Shadow Times Length',
    description: 'See the dot product as one vector\'s shadow on another times its length, and check it against a₁b₁ + a₂b₂ as you drag. Watch the sign change as the angle passes 90°.',
    keywords: ['dot product', 'scalar product', 'dot product geometric meaning', 'angle between vectors', 'cosine similarity', 'perpendicular vectors', 'vectors visualization'],
    openGraph: {
        title: 'Dot Product: Shadow Times Length – DSAverse',
        description: 'a · b = a₁b₁ + a₂b₂ = |a||b| cos θ. Drag the vectors and watch both sides agree.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/vectors/dot-product' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/vectors/dot-product" />
        </>
    );
}
