import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: "Transaction Isolation Levels Visualizer – Dirty Reads to Serializable",
    description: "Watch two transactions interleave on a shared accounts table under Read Uncommitted, Read Committed, Repeatable Read and Serializable. See dirty reads, non-repeatable reads, phantoms and lost updates appear, and the locks that make them disappear.",
    keywords: ["transaction isolation levels", "read uncommitted", "read committed", "repeatable read", "serializable", "dirty read", "non-repeatable read", "phantom read", "lost update", "ACID isolation"],
    openGraph: {
        title: "Transaction Isolation Levels Visualizer – DSAverse",
        description: "Two transactions, one table, four isolation levels: watch each anomaly appear and disappear.",
        images: [{ url: "/og-image.png" }],
    },
    alternates: { canonical: "/database-systems/transaction-isolation-levels" },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/database-systems/transaction-isolation-levels" />
        </>
    );
}
