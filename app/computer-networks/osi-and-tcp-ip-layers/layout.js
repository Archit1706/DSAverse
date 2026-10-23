import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: "OSI and TCP/IP Layers – Encapsulation Visualized",
    description: "Watch an HTTP request travel down the TCP/IP stack gaining a TCP, IP and Ethernet header, cross the wire as bits, pass a switch and a router, and get unwrapped layer by layer on the receiver. Maps OSI's seven layers onto TCP/IP's four.",
    keywords: ["OSI model", "TCP/IP model", "encapsulation", "decapsulation", "protocol stack", "network layers", "Ethernet frame", "IP packet", "TCP segment", "MTU", "MSS", "demultiplexing"],
    openGraph: {
        title: "OSI and TCP/IP Layers – DSAverse",
        description: "An HTTP request gains a header per layer on the way down and loses one per layer on the way up.",
        images: [{ url: "/og-image.png" }],
    },
    alternates: { canonical: "/computer-networks/osi-and-tcp-ip-layers" },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/computer-networks/osi-and-tcp-ip-layers" />
        </>
    );
}
