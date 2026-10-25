import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Matrix Multiplication Visualizer – Row Times Column, Map After Map',
    description: 'Compute AB entry by entry as row times column, then see it as one transformation followed by another. Follow a vector through B and then A, and watch AB and BA land in different places.',
    keywords: ['matrix multiplication', 'row times column', 'matrix composition', 'AB not equal BA', 'linear transformation composition', 'linear algebra visualization'],
    openGraph: {
        title: 'Matrix Multiplication – DSAverse',
        description: 'Row times column for the numbers, one map after another for the meaning, and why AB ≠ BA.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/linear-algebra/matrix-multiplication' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/linear-algebra/matrix-multiplication" />
        </>
    );
}
