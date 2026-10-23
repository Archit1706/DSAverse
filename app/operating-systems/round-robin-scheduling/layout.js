import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: "Round Robin Scheduling Visualizer – Time Quantum and Context Switches",
    description: "Watch a Round Robin ready queue cycle one time quantum at a time: processes slide to the CPU and back to the end of the line. Change the quantum and see response time improve while context switches pile up.",
    keywords: ["round robin scheduling", "time quantum", "time slice", "ready queue", "context switch", "response time", "preemptive scheduling", "CPU scheduling", "operating systems"],
    openGraph: {
        title: "Round Robin Scheduling Visualizer – DSAverse",
        description: "A ready queue that cycles every quantum, and the response-time versus context-switch trade-off of choosing that quantum.",
        images: [{ url: "/og-image.png" }],
    },
    alternates: { canonical: "/operating-systems/round-robin-scheduling" },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/operating-systems/round-robin-scheduling" />
        </>
    );
}
