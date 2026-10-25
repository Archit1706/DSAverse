import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata = {
    title: { template: '%s – Integral Calculus | DSAverse', default: 'Integral Calculus | DSAverse' },
    description: 'Interactive integral calculus: Riemann sums closing in on an area, signed area, the Fundamental Theorem as an accumulating area whose slope is f, substitution and integration by parts as pictures, area between curves, volumes of revolution in 3D, and numerical integration with its error orders.',
    keywords: ['integral calculus', 'riemann sums', 'definite integral', 'fundamental theorem of calculus', 'u-substitution', 'integration by parts', 'area between curves', 'volumes of revolution', 'simpsons rule', 'calculus visualization'],
    openGraph: {
        title: 'Integral Calculus Visualizers – DSAverse',
        description: 'Rectangles that become an area, an area that grows with slope f, and a region spun into a solid — integrals you can see.',
        images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
    alternates: { canonical: '/integral-calculus' },
};

export default function IntegralCalculusLayout({ children }) {
    return (
        <>
            <Navbar />
            <main className="pt-16">{children}</main>
            <Footer />
        </>
    );
}
