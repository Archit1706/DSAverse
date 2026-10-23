import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: "MVCC Visualizer – Multi-Version Concurrency Control",
    description: "See how multi-version concurrency control works: every update writes a new row version stamped with creating and deleting transaction ids, each transaction reads from its own snapshot, readers never block writers, and VACUUM removes versions no snapshot can see.",
    keywords: ["MVCC", "multi-version concurrency control", "snapshot isolation", "version chain", "xmin xmax", "PostgreSQL MVCC", "readers don't block writers", "vacuum", "first committer wins"],
    openGraph: {
        title: "MVCC Visualizer – DSAverse",
        description: "Version chains, snapshots and garbage collection: how databases let readers and writers run side by side.",
        images: [{ url: "/og-image.png" }],
    },
    alternates: { canonical: "/database-systems/mvcc" },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/database-systems/mvcc" />
        </>
    );
}
