import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: "Join Algorithms Visualizer – Nested Loop, Hash Join, Sort-Merge",
    description: "Run nested-loop join, hash join and sort-merge join on the same two tables and count every comparison. See the build and probe phases of a hash join, the two pointers of a merge join, and when each algorithm wins.",
    keywords: ["join algorithms", "nested loop join", "hash join", "sort merge join", "merge join", "build probe", "equi-join", "query execution", "database joins"],
    openGraph: {
        title: "Join Algorithms Visualizer – DSAverse",
        description: "Nested-loop, hash and sort-merge joins side by side, with every comparison counted.",
        images: [{ url: "/og-image.png" }],
    },
    alternates: { canonical: "/database-systems/join-algorithms" },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/database-systems/join-algorithms" />
        </>
    );
}
