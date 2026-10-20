import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Closed Hash Tables with Buckets Visualizer',
    description: 'Visualize bucketed hashing: each slot holds several entries, so a collision usually lands in the same cache line instead of probing away. Watch buckets fill and spill into the overflow area.',
    keywords: ['bucket hashing', 'bucketed hash table', 'closed hashing', 'overflow area', 'cache line', 'collision resolution', 'hash table visualization'],
    openGraph: {
        title: 'Closed Hash Tables with Buckets – DSAverse',
        description: 'Each slot is a small bucket, so most collisions resolve without leaving the cache line — until the bucket spills.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/indexing/closed-hash-tables-with-buckets' },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/indexing/closed-hash-tables-with-buckets" />
        </>
    );
}
