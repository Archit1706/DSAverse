import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Closed Hash Tables (Open Addressing) Visualizer',
    description: 'Visualize open addressing: linear probing, quadratic probing, and double hashing side by side. Watch probe sequences hunt for free slots, clustering build up, and tombstones keep deletes honest.',
    keywords: ['closed hashing', 'open addressing', 'linear probing', 'quadratic probing', 'double hashing', 'primary clustering', 'tombstone', 'hash table visualization'],
    openGraph: {
        title: 'Closed Hash Tables (Open Addressing) – DSAverse',
        description: 'Linear, quadratic, and double hashing probe sequences — plus why deleting needs a tombstone.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/indexing/closed-hash-tables' },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/indexing/closed-hash-tables" />
        </>
    );
}
