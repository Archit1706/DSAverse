import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: "Race Conditions Visualizer – counter++, Interleavings and Mutexes",
    description: "Two threads run counter++ as load, add and store. Step through any of the twenty possible interleavings, see the stale read and the lost update happen, then run the same schedules with a mutex or an atomic fetch-and-add and watch every one come out right.",
    keywords: ["race condition", "lost update", "counter++", "critical section", "mutex", "mutual exclusion", "atomic operation", "fetch and add", "interleaving", "thread synchronization", "operating systems"],
    openGraph: {
        title: "Race Conditions Visualizer – DSAverse",
        description: "All twenty interleavings of two counter++ calls — eighteen of them lose an update. Then a mutex makes every one correct.",
        images: [{ url: "/og-image.png" }],
    },
    alternates: { canonical: "/operating-systems/race-conditions" },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/operating-systems/race-conditions" />
        </>
    );
}
