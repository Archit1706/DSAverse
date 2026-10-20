import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'CPU Cache Hierarchy',
    description: 'Visualize L1/L2/L3 cache lines, spatial locality, cache hit vs miss, and why column-major array access causes cache thrashing.',
    keywords: ['cpu cache', 'cache hierarchy', 'l1 l2 l3', 'cache miss', 'spatial locality', 'performance'],
    openGraph: {
        title: 'CPU Cache Hierarchy – DSAverse',
        description: 'Cache lines, spatial locality, hits versus misses, and why column-major array access thrashes the cache.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/under-the-hood/cpu-cache-hierarchy' },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/under-the-hood/cpu-cache-hierarchy" />
        </>
    );
}
