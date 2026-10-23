import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: "Disk Scheduling Visualizer – FCFS, SSTF, SCAN, C-SCAN, LOOK and C-LOOK",
    description: "Plot the disk head's path across the cylinders under FCFS, SSTF, SCAN, C-SCAN, LOOK and C-LOOK. Watch the head sweep, reverse or jump back, and compare total seek distance for the same request queue across all six algorithms.",
    keywords: ["disk scheduling", "FCFS disk scheduling", "SSTF", "SCAN", "elevator algorithm", "C-SCAN", "LOOK", "C-LOOK", "seek time", "head movement", "operating systems"],
    openGraph: {
        title: "Disk Scheduling Visualizer – DSAverse",
        description: "Six disk-scheduling algorithms plotted as head movement over the cylinders, with total seek distance compared on the same queue.",
        images: [{ url: "/og-image.png" }],
    },
    alternates: { canonical: "/operating-systems/disk-scheduling" },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/operating-systems/disk-scheduling" />
        </>
    );
}
