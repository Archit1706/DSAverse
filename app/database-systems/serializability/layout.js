import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: "Conflict Serializability Visualizer – Precedence Graphs",
    description: "Find the conflicting read/write pairs in a transaction schedule, build the precedence graph edge by edge, and see why a cycle means the schedule is not conflict-serializable — or read the equivalent serial order off a topological sort.",
    keywords: ["serializability", "conflict serializability", "precedence graph", "serialization graph", "transaction schedule", "conflicting operations", "topological sort", "concurrency control"],
    openGraph: {
        title: "Conflict Serializability Visualizer – DSAverse",
        description: "Conflicting pairs, a precedence graph growing edge by edge, and the serial schedule it implies.",
        images: [{ url: "/og-image.png" }],
    },
    alternates: { canonical: "/database-systems/serializability" },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/database-systems/serializability" />
        </>
    );
}
