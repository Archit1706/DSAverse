import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: "Distance Vector Routing – Bellman-Ford, Count-to-Infinity, Poison Reverse",
    description: "Watch routers exchange distance vectors round by round until their tables converge, then fail a link and see bad news count to infinity — and how split horizon with poison reverse stops two-router loops but not longer ones.",
    keywords: ["distance vector routing", "Bellman-Ford", "RIP", "count to infinity", "split horizon", "poison reverse", "routing table", "routing loop", "convergence", "routing protocol"],
    openGraph: {
        title: "Distance Vector Routing – DSAverse",
        description: "Bellman-Ford table exchanges converging, then a link failure, count-to-infinity and poison reverse.",
        images: [{ url: "/og-image.png" }],
    },
    alternates: { canonical: "/computer-networks/distance-vector-routing" },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/computer-networks/distance-vector-routing" />
        </>
    );
}
