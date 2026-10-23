import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: "CPU Scheduling Visualizer – FCFS, SJF, SRTF and Priority",
    description: "Run FCFS, SJF, SRTF and Priority scheduling on the same processes and watch the Gantt chart grow step by step. Per-process waiting and turnaround times, averages compared across all four policies, and a Python simulator.",
    keywords: ["CPU scheduling", "FCFS", "first come first served", "SJF", "shortest job first", "SRTF", "shortest remaining time first", "priority scheduling", "Gantt chart", "waiting time", "turnaround time", "convoy effect", "operating systems"],
    openGraph: {
        title: "CPU Scheduling Visualizer – DSAverse",
        description: "FCFS, SJF, SRTF and Priority on one workload: a growing Gantt chart and the average waiting time each policy produces.",
        images: [{ url: "/og-image.png" }],
    },
    alternates: { canonical: "/operating-systems/cpu-scheduling" },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/operating-systems/cpu-scheduling" />
        </>
    );
}
