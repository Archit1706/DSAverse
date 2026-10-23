import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: "Memory Allocation Visualizer – First, Best, Worst and Next Fit",
    description: "Watch first fit, best fit, worst fit and next fit carve holes out of a memory bar as processes are allocated and freed. External fragmentation becomes visible when a request fails with enough total memory free, and compaction slides the blocks together to fix it.",
    keywords: ["memory allocation", "first fit", "best fit", "worst fit", "next fit", "external fragmentation", "compaction", "contiguous memory allocation", "holes", "operating systems"],
    openGraph: {
        title: "Memory Allocation Visualizer – DSAverse",
        description: "First, best, worst and next fit carving a memory bar — until a request fails with enough space free, and compaction slides everything together.",
        images: [{ url: "/og-image.png" }],
    },
    alternates: { canonical: "/operating-systems/memory-allocation" },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/operating-systems/memory-allocation" />
        </>
    );
}
