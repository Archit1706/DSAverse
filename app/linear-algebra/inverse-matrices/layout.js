import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Inverse Matrix Visualizer – Gauss–Jordan on [A | I]',
    description: 'Row-reduce [A | I] to [I | A⁻¹] one operation at a time, then watch the inverse carry the transformed grid — or the 3D box — back to where it started. See why a matrix with determinant 0 cannot be undone.',
    keywords: ['inverse matrix', 'Gauss-Jordan elimination', 'matrix inverse', 'singular matrix', 'A inverse', 'identity matrix', 'linear algebra visualization'],
    openGraph: {
        title: 'Inverse Matrices – DSAverse',
        description: 'Row-reduce [A | I] into [I | A⁻¹], then watch A⁻¹ undo A.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/linear-algebra/inverse-matrices' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/linear-algebra/inverse-matrices" />
        </>
    );
}
