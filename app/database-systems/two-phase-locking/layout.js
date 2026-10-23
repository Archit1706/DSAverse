import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: "Two-Phase Locking (2PL) Visualizer – Locks, Deadlocks, Strict 2PL",
    description: "Watch shared and exclusive locks queue up in a lock table as transactions grow and then shrink their lock sets. See waiting, a deadlock in the waits-for graph, a cascading abort under basic 2PL, and how strict 2PL prevents it.",
    keywords: ["two-phase locking", "2PL", "strict 2PL", "shared lock", "exclusive lock", "lock table", "deadlock", "waits-for graph", "cascading abort", "concurrency control"],
    openGraph: {
        title: "Two-Phase Locking Visualizer – DSAverse",
        description: "Lock tables, growing and shrinking phases, deadlocks and strict 2PL, step by step.",
        images: [{ url: "/og-image.png" }],
    },
    alternates: { canonical: "/database-systems/two-phase-locking" },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/database-systems/two-phase-locking" />
        </>
    );
}
