import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: "LSM Tree Visualizer – Memtables, SSTables, Compaction, Bloom Filters",
    description: "Watch writes land in an in-memory memtable, flush to immutable sorted SSTables and get merged by compaction, while reads check the newest data first and skip tables with Bloom filters. Compare the write and read costs with a B-tree.",
    keywords: ["LSM tree", "log-structured merge tree", "memtable", "SSTable", "compaction", "Bloom filter", "tombstone", "write amplification", "RocksDB", "Cassandra"],
    openGraph: {
        title: "LSM Tree Visualizer – DSAverse",
        description: "Memtable, flush, compaction and Bloom-filtered reads — the storage engine behind RocksDB and Cassandra.",
        images: [{ url: "/og-image.png" }],
    },
    alternates: { canonical: "/database-systems/lsm-trees" },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/database-systems/lsm-trees" />
        </>
    );
}
