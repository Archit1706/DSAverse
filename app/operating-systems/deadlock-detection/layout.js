import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: "Deadlock Detection Visualizer – Resource-Allocation and Wait-For Graphs",
    description: "Collapse a resource-allocation graph into a wait-for graph edge by edge, then watch depth-first search walk it for a cycle. The four Coffman conditions are tied to what is on screen, and processes stuck behind a deadlock are told apart from those in it.",
    keywords: ["deadlock detection", "resource allocation graph", "wait-for graph", "cycle detection", "depth-first search", "Coffman conditions", "circular wait", "hold and wait", "operating systems"],
    openGraph: {
        title: "Deadlock Detection Visualizer – DSAverse",
        description: "A resource-allocation graph collapsed into a wait-for graph, and a depth-first search hunting it for the cycle that means deadlock.",
        images: [{ url: "/og-image.png" }],
    },
    alternates: { canonical: "/operating-systems/deadlock-detection" },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/operating-systems/deadlock-detection" />
        </>
    );
}
