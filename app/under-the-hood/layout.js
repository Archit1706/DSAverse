import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata = {
    title: { template: '%s – Under the Hood | DSAverse', default: 'Under the Hood | DSAverse' },
    description: 'Visualize what really happens inside computers — DNS resolution, TCP/TLS handshakes, Python bytecode, CPU caches, garbage collection, and more. CS internals made visual.',
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
