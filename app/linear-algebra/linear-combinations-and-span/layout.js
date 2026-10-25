import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Linear Combinations and Span Visualizer – What Two Vectors Reach',
    description: 'Slide two coefficients and watch c₁a + c₂b move, see the whole-number lattice the vectors build, and watch the span collapse from the whole plane to a line when the vectors line up. In 3D, two vectors span a plane.',
    keywords: ['linear combination', 'span', 'linear independence', 'spanning set', 'basis', 'linear algebra visualization', 'span of vectors 3D'],
    openGraph: {
        title: 'Linear Combinations and Span – DSAverse',
        description: 'Everything c₁a + c₂b can reach: the whole plane, a line, or a plane in 3D.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/linear-algebra/linear-combinations-and-span' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/linear-algebra/linear-combinations-and-span" />
        </>
    );
}
