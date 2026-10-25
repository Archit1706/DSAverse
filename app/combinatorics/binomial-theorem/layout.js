import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Binomial Theorem Visualizer – (a + b)ⁿ as Choices, Area and a 3D Cube',
    description: 'Expand (a + b)ⁿ by picking a or b from every factor and grouping the picks by how many b\'s they contain — the group sizes are C(n, k). Drag the sides of the (a + b)² square, orbit (a + b)³ as a cube cut into 8 blocks, and check every term with live numbers.',
    keywords: ['binomial theorem', 'binomial expansion', '(a+b)^n', 'binomial coefficients', 'a plus b cubed', 'binomial cube', 'pascals triangle', 'combinatorics'],
    openGraph: {
        title: 'Binomial Theorem – DSAverse',
        description: 'Why the coefficients of (a + b)ⁿ are C(n, k): count the ways to pick k b\'s. Then see (a + b)³ as a cube in 3D.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/combinatorics/binomial-theorem' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/combinatorics/binomial-theorem" />
        </>
    );
}
