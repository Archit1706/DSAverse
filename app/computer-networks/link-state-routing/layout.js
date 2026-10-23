import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: "Link State Routing – LSA Flooding and Dijkstra Forwarding Tables",
    description: "Watch link-state advertisements flood a network round by round until every router holds the same map, then follow one router's Dijkstra run to its forwarding table — and see a link failure reconverge without counting to infinity.",
    keywords: ["link state routing", "OSPF", "IS-IS", "link-state advertisement", "LSA", "flooding", "link state database", "Dijkstra", "shortest path tree", "forwarding table", "sequence number"],
    openGraph: {
        title: "Link State Routing – DSAverse",
        description: "LSAs flood until every router has the same map; each router runs Dijkstra for its own forwarding table.",
        images: [{ url: "/og-image.png" }],
    },
    alternates: { canonical: "/computer-networks/link-state-routing" },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/computer-networks/link-state-routing" />
        </>
    );
}
