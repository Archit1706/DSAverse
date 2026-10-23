import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: "HTTP/1.1 vs HTTP/2 vs HTTP/3 – Head-of-Line Blocking Visualized",
    description: "Load the same page over HTTP/1.1, HTTP/2 and HTTP/3 and watch head-of-line blocking move: queued responses in HTTP/1.1, one lost TCP segment stalling every HTTP/2 stream, and QUIC over UDP letting only the affected stream wait.",
    keywords: ["HTTP/1.1", "HTTP/2", "HTTP/3", "QUIC", "head-of-line blocking", "multiplexing", "streams", "TCP", "UDP", "packet loss", "web performance"],
    openGraph: {
        title: "HTTP/1.1 vs HTTP/2 vs HTTP/3 – DSAverse",
        description: "Head-of-line blocking at the application layer, in TCP, and how QUIC removes it.",
        images: [{ url: "/og-image.png" }],
    },
    alternates: { canonical: "/computer-networks/http1-vs-http2-vs-http3" },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/computer-networks/http1-vs-http2-vs-http3" />
        </>
    );
}
