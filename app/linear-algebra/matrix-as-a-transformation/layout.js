import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Matrix as a Transformation – Drag the Basis Vectors',
    description: 'See what a 2×2 matrix really does: its columns are where î and ĵ land, and the whole grid follows them. Drag the basis vectors, edit the matrix, and watch shears, rotations, reflections and a squash onto a line.',
    keywords: ['matrix transformation', 'linear transformation', 'basis vectors', 'matrix vector multiplication', 'shear matrix', 'rotation matrix', 'linear algebra visualization', '2x2 matrix'],
    openGraph: {
        title: 'Matrix as a Transformation – DSAverse',
        description: 'Drag î and ĵ and the whole plane moves with them. The columns of a matrix are where the basis vectors land.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/linear-algebra/matrix-as-a-transformation' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/linear-algebra/matrix-as-a-transformation" />
        </>
    );
}
