import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: "Database Normalization Visualizer – 1NF, 2NF, 3NF and BCNF",
    description: "Start from a messy table, find its functional dependencies and candidate keys, see its update, insert and delete anomalies, then watch it split into 1NF, 2NF, 3NF and BCNF — with every decomposition lossless.",
    keywords: ["database normalization", "1NF", "2NF", "3NF", "BCNF", "functional dependency", "candidate key", "update anomaly", "lossless decomposition", "dependency preservation"],
    openGraph: {
        title: "Normalization Visualizer – DSAverse",
        description: "Functional dependencies, anomalies, and a table splitting step by step into BCNF.",
        images: [{ url: "/og-image.png" }],
    },
    alternates: { canonical: "/database-systems/normalization" },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/database-systems/normalization" />
        </>
    );
}
