import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: "SQL Logical Query Order Visualizer – FROM to LIMIT",
    description: "Watch rows flow through FROM, JOIN, WHERE, GROUP BY, HAVING, SELECT, DISTINCT, ORDER BY and LIMIT in the order SQL actually evaluates them — and see why a SELECT alias works in ORDER BY but not in WHERE.",
    keywords: ["SQL query order", "logical query processing", "SQL execution order", "WHERE vs HAVING", "GROUP BY", "SELECT alias in WHERE", "ORDER BY", "DISTINCT", "LIMIT"],
    openGraph: {
        title: "SQL Query Order Visualizer – DSAverse",
        description: "Rows flowing through every SQL clause in logical order, and why aliases cannot be used in WHERE.",
        images: [{ url: "/og-image.png" }],
    },
    alternates: { canonical: "/database-systems/sql-query-order" },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/database-systems/sql-query-order" />
        </>
    );
}
