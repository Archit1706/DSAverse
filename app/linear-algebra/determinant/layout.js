import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Determinant Visualizer – Area in 2D, Volume in 3D',
    description: 'See the determinant as how much a matrix scales area and volume. Drag the columns of a 2×2 matrix and watch the unit square become a parallelogram, then orbit a 3D parallelepiped whose volume is det [a b c] — including negative and zero determinants.',
    keywords: ['determinant', 'determinant visualization', 'determinant as area', 'determinant as volume', 'parallelepiped', 'scalar triple product', 'singular matrix', 'linear algebra 3D'],
    openGraph: {
        title: 'Determinant: Area and Volume – DSAverse',
        description: 'The unit square becomes a parallelogram, the unit cube a parallelepiped, and the determinant is how much space grew — or flipped, or collapsed.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/linear-algebra/determinant' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/linear-algebra/determinant" />
        </>
    );
}
