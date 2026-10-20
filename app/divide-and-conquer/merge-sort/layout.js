import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Merge Sort — Recursion Tree',
    description: 'Visualize merge sort as a recursion tree: watch the array split down to single elements, then see sorted subarrays merge back up level by level.',
    keywords: ['merge sort', 'recursion tree', 'divide and conquer', 'O(n log n)', 'sorting algorithm', 'visualization'],
    openGraph: {
        title: 'Merge Sort Recursion Tree – DSAverse',
        description: 'Watch the array split down to single elements, then see sorted subarrays merge back up level by level.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/divide-and-conquer/merge-sort' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/divide-and-conquer/merge-sort" />
        </>
    );
}
