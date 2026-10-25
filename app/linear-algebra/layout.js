import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata = {
    title: { template: '%s – Linear Algebra | DSAverse', default: 'Linear Algebra | DSAverse' },
    description: 'Interactive linear algebra: drag basis vectors and watch matrices transform the plane, see determinants as area and volume in 3D, and build intuition for span, elimination, eigenvectors and least squares.',
    keywords: ['linear algebra', 'matrix transformation', 'determinant', 'eigenvectors', 'gaussian elimination', 'span', 'change of basis', 'least squares', 'linear algebra visualization'],
    openGraph: {
        title: 'Linear Algebra Visualizers – DSAverse',
        description: 'Drag î and ĵ and watch the whole plane move. Determinants as area and volume, eigenvectors that keep their direction, and more.',
        images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
    alternates: { canonical: '/linear-algebra' },
};

export default function LinearAlgebraLayout({ children }) {
    return (
        <>
            <Navbar />
            <main className="pt-16">{children}</main>
            <Footer />
        </>
    );
}
