import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: "TCP Congestion Control – Slow Start, AIMD, Tahoe vs Reno",
    description: "Plot TCP's congestion window round trip by round trip: exponential slow start up to ssthresh, additive increase, multiplicative decrease, and why Reno halves cwnd on three duplicate ACKs while Tahoe and every timeout drop it to one segment.",
    keywords: ["TCP congestion control", "congestion window", "cwnd", "slow start", "ssthresh", "AIMD", "additive increase multiplicative decrease", "TCP Tahoe", "TCP Reno", "fast retransmit", "fast recovery", "duplicate ACK"],
    openGraph: {
        title: "TCP Congestion Control – DSAverse",
        description: "cwnd over RTTs: slow start, ssthresh, AIMD and the sawtooth, with Tahoe and Reno side by side.",
        images: [{ url: "/og-image.png" }],
    },
    alternates: { canonical: "/computer-networks/tcp-congestion-control" },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/computer-networks/tcp-congestion-control" />
        </>
    );
}
