import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: "Dining Philosophers Visualizer – Deadlock and Resource Ordering",
    description: "Five philosophers, five forks. Watch the naive left-then-right strategy deadlock with everyone holding one fork, then number the forks, take the lower one first, and see the circular wait become impossible.",
    keywords: ["dining philosophers", "deadlock", "resource ordering", "circular wait", "lock ordering", "starvation", "synchronization", "Dijkstra", "operating systems"],
    openGraph: {
        title: "Dining Philosophers Visualizer – DSAverse",
        description: "The naive fork grab that deadlocks, and the one-line resource-ordering fix that cannot.",
        images: [{ url: "/og-image.png" }],
    },
    alternates: { canonical: "/operating-systems/dining-philosophers" },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/operating-systems/dining-philosophers" />
        </>
    );
}
