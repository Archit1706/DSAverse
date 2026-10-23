import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: "Page Replacement Visualizer – FIFO, LRU and Optimal",
    description: "Step through FIFO, LRU and Optimal page replacement on a reference string: frames fill, every reference is a hit or a fault, and each eviction shows why that page was chosen. Includes a Belady's anomaly preset where more frames cause more faults.",
    keywords: ["page replacement", "FIFO page replacement", "LRU", "least recently used", "optimal page replacement", "Belady's anomaly", "page fault", "reference string", "virtual memory", "operating systems"],
    openGraph: {
        title: "Page Replacement Visualizer – DSAverse",
        description: "FIFO, LRU and Optimal on one reference string, with every hit, fault and eviction explained — and the string where four frames fault more than three.",
        images: [{ url: "/og-image.png" }],
    },
    alternates: { canonical: "/operating-systems/page-replacement" },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/operating-systems/page-replacement" />
        </>
    );
}
