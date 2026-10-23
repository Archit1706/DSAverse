import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: "Relational Algebra Visualizer – Selection, Projection, Join, Union",
    description: "Evaluate relational algebra expression trees bottom-up on small tables: selection, projection with duplicate elimination, natural join, union, difference and rename, one tuple at a time.",
    keywords: ["relational algebra", "selection", "projection", "natural join", "union", "set difference", "rename", "expression tree", "query plan", "set semantics"],
    openGraph: {
        title: "Relational Algebra Visualizer – DSAverse",
        description: "σ, π, ⋈, ∪, − and ρ evaluated bottom-up through an expression tree.",
        images: [{ url: "/og-image.png" }],
    },
    alternates: { canonical: "/database-systems/relational-algebra" },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/database-systems/relational-algebra" />
        </>
    );
}
