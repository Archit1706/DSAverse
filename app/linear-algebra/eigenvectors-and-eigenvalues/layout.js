import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Eigenvectors and Eigenvalues Visualizer – Av = λv',
    description: 'Sweep a vector around the unit circle and light up the directions a matrix keeps on their own line. See the eigenvalue as the stretch, negative eigenvalues as flips, rotations with none, and power iteration finding the dominant one.',
    keywords: ['eigenvectors', 'eigenvalues', 'Av = λv', 'characteristic equation', 'power iteration', 'eigen decomposition', 'linear algebra visualization'],
    openGraph: {
        title: 'Eigenvectors and Eigenvalues – DSAverse',
        description: 'The directions a matrix keeps on their own line, and how much it stretches them.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/linear-algebra/eigenvectors-and-eigenvalues' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/linear-algebra/eigenvectors-and-eigenvalues" />
        </>
    );
}
