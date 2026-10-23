import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: "Producer-Consumer Visualizer – Bounded Buffer with Semaphores",
    description: "Watch producers and consumers share a bounded buffer guarded by empty, full and mutex semaphores. Step by step, threads block when the buffer is full or empty and wake when another thread signals — and swapping two waits turns it into a deadlock.",
    keywords: ["producer consumer", "bounded buffer", "semaphore", "wait signal", "P and V operations", "mutex", "counting semaphore", "thread synchronization", "deadlock", "operating systems"],
    openGraph: {
        title: "Producer-Consumer Visualizer – DSAverse",
        description: "A bounded buffer, three semaphores and threads that sleep and wake — plus the one-line ordering bug that deadlocks it.",
        images: [{ url: "/og-image.png" }],
    },
    alternates: { canonical: "/operating-systems/producer-consumer" },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/operating-systems/producer-consumer" />
        </>
    );
}
