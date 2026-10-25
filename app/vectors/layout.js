import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata = {
    title: { template: '%s – Vectors | DSAverse', default: 'Vectors | DSAverse' },
    description: 'Interactive vectors: drag an arrow and watch its coordinates change, add and scale vectors tip to tail, see the dot product as a shadow, orbit the cross product in 3D, and project onto lines and planes.',
    keywords: ['vectors', 'vector addition', 'dot product', 'cross product', 'vector projection', 'unit vector', 'vector norm', 'lines and planes', 'vectors visualization'],
    openGraph: {
        title: 'Vectors Visualizers – DSAverse',
        description: 'An arrow and a list of numbers are the same thing. Drag one and watch the other change, then build up to dot and cross products, projections and planes in 3D.',
        images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
    alternates: { canonical: '/vectors' },
};

export default function VectorsLayout({ children }) {
    return (
        <>
            <Navbar />
            <main className="pt-16">{children}</main>
            <Footer />
        </>
    );
}
