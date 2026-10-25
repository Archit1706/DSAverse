import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Change of Basis Visualizer – One Vector, Two Grids',
    description: 'Drag two basis vectors and a vector, and read its coordinates on the standard grid and on the new one. Convert with the basis matrix and back with its inverse.',
    keywords: ['change of basis', 'basis', 'coordinates', 'basis matrix', 'coordinate transformation', 'B inverse', 'linear algebra visualization'],
    openGraph: {
        title: 'Change of Basis – DSAverse',
        description: 'One arrow, two coordinate grids: v = B[v]_B and [v]_B = B⁻¹v.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/linear-algebra/change-of-basis' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/linear-algebra/change-of-basis" />
        </>
    );
}
