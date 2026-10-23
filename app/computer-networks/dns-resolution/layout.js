import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: "DNS Resolution Visualizer – Root, TLD, Authoritative and Caching",
    description: "Follow a DNS lookup from the stub resolver to a recursive resolver, which walks the root, TLD and authoritative servers by referral — then watch later lookups answered from cache, skip straight to a cached zone, and go back out once a TTL expires.",
    keywords: ["DNS resolution", "recursive resolver", "iterative query", "root server", "TLD server", "authoritative name server", "DNS caching", "TTL", "DNS referral", "NS record", "A record", "stub resolver"],
    openGraph: {
        title: "DNS Resolution Visualizer – DSAverse",
        description: "Stub to recursive resolver to root, TLD and authoritative servers — then caching and TTL expiry.",
        images: [{ url: "/og-image.png" }],
    },
    alternates: { canonical: "/computer-networks/dns-resolution" },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/computer-networks/dns-resolution" />
        </>
    );
}
