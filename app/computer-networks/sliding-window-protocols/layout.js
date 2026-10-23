import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: "Sliding Window Protocols – Stop-and-Wait, Go-Back-N, Selective Repeat",
    description: "Watch packets and ACKs in flight under Stop-and-Wait, Go-Back-N and Selective Repeat. Drop any packet or ACK, see the timeout fire, compare what each protocol retransmits, and watch the sender's window slide.",
    keywords: ["sliding window protocol", "go-back-n", "selective repeat", "stop and wait", "ARQ", "automatic repeat request", "cumulative ACK", "retransmission timeout", "pipelining", "reliable data transfer"],
    openGraph: {
        title: "Sliding Window Protocols – DSAverse",
        description: "Stop-and-Wait, Go-Back-N and Selective Repeat with injectable losses, timeouts and a window that slides.",
        images: [{ url: "/og-image.png" }],
    },
    alternates: { canonical: "/computer-networks/sliding-window-protocols" },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/computer-networks/sliding-window-protocols" />
        </>
    );
}
