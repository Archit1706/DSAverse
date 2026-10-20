import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'How the Internet Routes a Packet',
    description: 'Visualize a packet crossing the internet — the IP header, subnet masks and ARP, the default gateway, NAT translation, longest-prefix-match routing tables, TTL decrement hop by hop, BGP between autonomous systems, and what traceroute actually does.',
    keywords: ['ip routing', 'packet', 'ttl', 'arp', 'subnet mask', 'default gateway', 'nat', 'longest prefix match', 'routing table', 'bgp', 'autonomous system', 'traceroute'],
    openGraph: {
        title: 'How the Internet Routes a Packet – DSAverse',
        description: 'ARP, NAT, longest-prefix-match routing, TTL decrement, and BGP, traced hop by hop across the internet.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/under-the-hood/how-the-internet-routes-a-packet' },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/under-the-hood/how-the-internet-routes-a-packet" />
        </>
    );
}
