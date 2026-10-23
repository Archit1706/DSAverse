import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: "Banker's Algorithm Visualizer – Safety Check and Resource Requests",
    description: "Step through the Banker's algorithm: Allocation, Max, Need and Available, the safety check building a safe sequence one process at a time, and resource requests that are granted, made to wait, or refused because they would leave the system unsafe.",
    keywords: ["banker's algorithm", "deadlock avoidance", "safe state", "safe sequence", "safety algorithm", "resource request algorithm", "need matrix", "available vector", "operating systems"],
    openGraph: {
        title: "Banker's Algorithm Visualizer – DSAverse",
        description: "Allocation, Max, Need and Available — watch the safety check find a safe sequence, and a request get granted or refused.",
        images: [{ url: "/og-image.png" }],
    },
    alternates: { canonical: "/operating-systems/bankers-algorithm" },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/operating-systems/bankers-algorithm" />
        </>
    );
}
