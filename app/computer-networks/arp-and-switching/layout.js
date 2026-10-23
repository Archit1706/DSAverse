import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: "ARP and Switching – MAC Learning, Flooding and Forwarding",
    description: "Watch a host broadcast an ARP request and get a unicast reply, while an Ethernet switch learns which MAC address lives on which port: flooding frames for unknown destinations, forwarding them once learned, and flooding again after its table ages out.",
    keywords: ["ARP", "address resolution protocol", "ARP cache", "Ethernet switch", "MAC address table", "MAC learning", "flooding", "unicast flooding", "broadcast", "layer 2 switching", "MAC aging"],
    openGraph: {
        title: "ARP and Switching – DSAverse",
        description: "An ARP broadcast and its reply, and a switch learning MAC addresses: flood when unknown, forward once learned.",
        images: [{ url: "/og-image.png" }],
    },
    alternates: { canonical: "/computer-networks/arp-and-switching" },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/computer-networks/arp-and-switching" />
        </>
    );
}
