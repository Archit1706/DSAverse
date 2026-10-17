import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata = {
    title: { template: '%s – Under the Hood | DSAverse', default: 'Under the Hood | DSAverse' },
    description: 'Visualize what really happens inside computers — DNS resolution, TCP/TLS handshakes, Python bytecode, CPU caches, garbage collection, and more. CS internals made visual.',
    openGraph: {
        title: 'Under the Hood – CS Internals Visualized | DSAverse',
        description: 'Animated explainers for what really happens inside computers: language runtimes, memory, concurrency, networks, and systems.',
        images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
    alternates: { canonical: '/under-the-hood' },
};

export default function UnderTheHoodLayout({ children }) {
    return (
        <>
            <Navbar />
            <main className="pt-16">{children}</main>
            <Footer />
        </>
    );
}
