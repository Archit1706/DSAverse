import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata = {
    title: { template: '%s – Computer Networks | DSAverse', default: 'Computer Networks | DSAverse' },
    description: 'Interactive visualizations of how networks actually move data — encapsulation, the TCP handshake, sliding windows, congestion control, DNS, subnetting, routing protocols, ARP and the HTTP versions.',
    keywords: ['computer networks', 'TCP', 'OSI model', 'sliding window', 'congestion control', 'DNS', 'subnetting', 'CIDR', 'distance vector routing', 'link state routing', 'ARP', 'HTTP/2', 'HTTP/3', 'QUIC', 'networking visualization'],
    openGraph: {
        title: 'Computer Networks Visualizers – DSAverse',
        description: 'Watch packets gain headers, windows slide, cwnd saw and routing tables converge — the protocols behind every connection.',
        images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
    alternates: { canonical: '/computer-networks' },
};

export default function ComputerNetworksLayout({ children }) {
    return (
        <>
            <Navbar />
            <main className="pt-16">{children}</main>
            <Footer />
        </>
    );
}
