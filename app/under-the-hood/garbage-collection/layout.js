import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Garbage Collection',
    description: 'Visualize garbage collection strategies: reference counting, cyclic GC, mark-and-sweep, and generational collection.',
    keywords: ['garbage collection', 'mark sweep', 'reference counting', 'memory management', 'gc'],
    openGraph: {
        title: 'Garbage Collection – DSAverse',
        description: 'Reference counting, cycle detection, mark-and-sweep, and generational collection shown side by side.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/under-the-hood/garbage-collection' },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/under-the-hood/garbage-collection" />
        </>
    );
}
