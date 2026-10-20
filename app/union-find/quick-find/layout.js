import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Quick Find',
    description: 'Visualize Quick Find Union-Find: a flat id[] array where find() is O(1) and union() scans the whole array to relabel a component.',
    keywords: ['quick find', 'union find', 'disjoint set', 'flat array', 'O(n) union', 'visualization'],
    openGraph: {
        title: 'Quick Find – DSAverse',
        description: 'A flat id[] array where find() is O(1) and union() rescans the whole array to relabel an entire component.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/union-find/quick-find' },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/union-find/quick-find" />
        </>
    );
}
