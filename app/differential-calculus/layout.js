import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata = {
    title: { template: '%s – Differential Calculus | DSAverse', default: 'Differential Calculus | DSAverse' },
    description: 'Interactive differential calculus: approach a limit from both sides, shrink a secant into a tangent, read f′ and f″ off a graph, optimise an open box, watch Newton\'s method and Taylor polynomials converge, and walk gradient descent down a 3D loss surface.',
    keywords: ['differential calculus', 'limits', 'derivative', 'derivative rules', 'chain rule', 'optimization', 'newtons method', 'taylor series', 'partial derivatives', 'gradient', 'gradient descent', 'calculus visualization'],
    openGraph: {
        title: 'Differential Calculus Visualizers – DSAverse',
        description: 'A secant becoming a tangent, f, f′ and f″ tied together, Newton\'s tangents walking to a root, and a ball rolling down a loss surface.',
        images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
    alternates: { canonical: '/differential-calculus' },
};

export default function DifferentialCalculusLayout({ children }) {
    return (
        <>
            <Navbar />
            <main className="pt-16">{children}</main>
            <Footer />
        </>
    );
}
