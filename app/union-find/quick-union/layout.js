import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Quick Union',
    description: 'Visualize Quick Union: each element stores a parent pointer forming a forest. union() re-points one root; find() walks the chain to the root.',
    keywords: ['quick union', 'union find', 'disjoint set', 'tree pointers', 'forest', 'visualization'],
    openGraph: {
        title: 'Quick Union – DSAverse',
        description: 'Parent pointers form a forest: union() re-points one root while find() walks the chain upward to it.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/union-find/quick-union' },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/union-find/quick-union" />
        </>
    );
}
