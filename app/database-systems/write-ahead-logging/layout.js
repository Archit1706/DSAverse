import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: "Write-Ahead Logging Visualizer – Crash Recovery with Redo and Undo",
    description: "Follow log records with LSNs through a buffer pool and onto disk. See the write-ahead rule force the log before a page, commits forced to the log, a crash that wipes memory, and ARIES-style recovery: analysis, redo history, undo the losers with compensation records.",
    keywords: ["write-ahead logging", "WAL", "crash recovery", "ARIES", "redo undo", "LSN", "pageLSN", "steal no-force", "compensation log record", "durability"],
    openGraph: {
        title: "Write-Ahead Logging Visualizer – DSAverse",
        description: "Log before data, force at commit, then crash and recover: redo history, undo the losers.",
        images: [{ url: "/og-image.png" }],
    },
    alternates: { canonical: "/database-systems/write-ahead-logging" },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/database-systems/write-ahead-logging" />
        </>
    );
}
