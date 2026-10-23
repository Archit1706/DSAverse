import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: "TCP Handshake Visualizer – SYN, SYN-ACK, ACK and TIME_WAIT",
    description: "Step through a full TCP connection: the three-way handshake with real sequence and acknowledgement numbers, both endpoints' state machines (LISTEN, SYN_SENT, SYN_RECEIVED, ESTABLISHED), a request and response, the FIN teardown and why TIME_WAIT exists.",
    keywords: ["TCP handshake", "three-way handshake", "SYN SYN-ACK ACK", "sequence number", "acknowledgement number", "TCP state machine", "TIME_WAIT", "FIN", "CLOSE_WAIT", "connection teardown"],
    openGraph: {
        title: "TCP Handshake Visualizer – DSAverse",
        description: "SYN, SYN-ACK, ACK with real sequence numbers, both state machines, the FIN teardown and TIME_WAIT.",
        images: [{ url: "/og-image.png" }],
    },
    alternates: { canonical: "/computer-networks/tcp-handshake" },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/computer-networks/tcp-handshake" />
        </>
    );
}
